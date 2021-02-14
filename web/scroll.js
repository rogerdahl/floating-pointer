// Scrolling

/*
Modes

In mouse wheel mode, the scroller generates a series of up or down scroll events at a frequency
selected by the user. The events correspond to the notches that one usually feels when turning a
real scroll wheel.

In browser smooth scroll mode, the scroller just holds down the middle mouse button and moves the
mouse pointer slightly up and down to adjust the scroll speed.


Rounding errors

The virtual mouse support on Linux moves the pointer in integer steps, corresponding to full pixels.
The touch screens on phones and tablets provide positions in fractional (float) values. Since we
have to round the floats to ints and can only move the pointer relatively and in integer / full
pixel steps, this causes cumulative rounding errors. The errors manifest as the mouse pointer
appearing to prefer to follow certain "tracks" while moving across the screen. The "tracks" appear
where the x/y positions create fractions like 1/2, 1/3, 2/3, etc.

To fix this, we use f64 floats, which we round to ints before passing to Enigo. We track the
rounding errors and, when the combined error reaches one pixel or more, we remove one pixel from the
error and apply it to the mouse pointer position.


Update rate

Checking which frequency to scroll at only once per event can be done with a simple loop that reads
the frequency, waits for the amount of time required for that frequency, then sends the events and
repeats. But users often scroll at only one or two events per second, and checking the user's
selection so rarely would probably cause the response to feel sluggish. So this implementation uses
a different approach, where the user's selection is checked at a constant rate (60 Hz by default).
At each check, the time interval required for meeting the currently selected frequency is compared
with the actual time since the last event was generated, and a new event is generated if the actual
time is longer.
*/

'use strict';

import * as settings from './settings.js';
import * as touch from './touch.js';
import * as ws from './ws.js';
import * as util from './util.js';
import * as log from './log.js';

// Exported

export function register_event_handlers()
{
  log.debug('scroll.register_event_handlers()');

  $('#smooth-scroll-toggle').on('click', (ev) => {
    // alert(1);
    scroll.smooth_toggle = !scroll.smooth_toggle;
    $(ev.currentTarget).toggleClass('highlight', scroll.smooth_toggle);
    if (scroll.smooth_toggle) {
      log.status('Using browser smooth scrolling');
    }
    else {
      log.status('Using mouse wheel scrolling');
    }
  });

  scroll_el
      .on('mousedown touchstart', (ev) => {
        handle_touch_start(ev);
        return util.stop(ev);
      })
      .on('mouseup touchend', (ev) => {
        handle_touch_end(ev);
        return util.stop(ev);
      })
      .on('mousemove touchmove', util.rate_limiter((ev) => {
        handle_touch_move(ev);
        return util.stop(ev);
      }, settings.SCROLL_MOVE_RATE_LIMIT_HZ))
  ;
}

// State vars for scrolling.
const scroll = {
  smooth_toggle: false
}

function reset_scroll()
{

  console.assert(scroll.interval_handle == null)
  // - For wheel scroll, dy is the distance between starting and ending touch positions.
  // - For smooth scroll, dy is the distance between starting and ending mouse cursor position on
  // the desktop machine.
  scroll.dy = 0;
  // A copy of dy from the previous event. dy is the distance between the point where the touch
  // started and where the touch currently is. It represents how far the touch has been dragged and,
  // together with a couple of constants for the settings, decide the scroll speed.
  scroll.last_dy = 0;
  // Distance between start point and current point of the mouse pointer on the desktop machine.
  // This can be different from the distance on the tablet due to the cumulative rounding errors
  // described in the header.
  scroll.desktop_dy = 0;
  // true = Manual scrolling is active and the scroll speed indicator is showing.
  scroll.active = false;
  // indicated with the scroll.active and scroll.auto flags.
  // true = Smooth or wheel based auto-scroll is going. The scroll speed indicator is showing and is
  // highlighted.
  scroll.smooth = false
  // true = The "Smooth" button has been toggled on ; but we may not actually be scrolling. That's
  // scroll.smooth_toggle = false;
  scroll.auto = false;
  // Handle for the wheel scroll interval timer
  scroll.interval_handle = null;
  // Point in time when the most recent mouse wheel scroll event ws triggered
  scroll.interval_start_ts = null;
  // Scroll speed recorded at last move event.
}

// End state of previous regular scroll. Used when starting auto scroll.
const last_scroll = {
  auto: false,
  smooth: false,
  // dy==null indicates that auto scroll is not available, as a regular scroll has
  // not yet been done.
  dy: null,
}

const scroll_el = $('#scroll');

// Touch start and stop
// When we handle touch_start, we don't yet know if the touch will be a touch or a tap.
// We start out handling it as a touch. At touch_end, we determine if it was a touch
// or a tap, and, on tap, start auto scrolling.
function handle_touch_start(ev)
{
  log.debug(ev, 'handle_touch_start()');
  // TODO: Cant do stop_all() here since it wipes out info about what the previous
  // state was, which we need in order to determine the next step.
  // stop_all(ev)
  scroll.dy = 0;
  scroll.last_dy = 0;
  scroll.smooth = scroll.smooth_toggle;
  if (scroll.smooth) {
    start_smooth(ev);
  }
  else {
    start_wheel(ev);
  }
  scroll.active = true;
  sync_indicator(ev);
}

function start_smooth(ev)
{
  middle_up_down('down');
  scroll.desktop_dy = 0;
}

function start_wheel(ev)
{
  start_interval_timer(ev);
}

function start_auto(ev)
{
  log.debug(ev, 'Starting auto-scroll');
  log.debug(
      ev, `scroll auto=${scroll.auto} smooth=${scroll.smooth} dy=${scroll.dy} `
  );
  if (scroll.smooth) {
    middle_up_down('down');
    ws.send('touch', 0, scroll.dy.toFixed(3));
  }
  else {
    start_wheel(ev);
  }
  scroll.active = true;
  sync_indicator(ev);
}

function handle_touch_end(ev)
{
  let is_tap = touch.is_tap(ev);
  // Tap when not auto scrolling starts auto.
  if (is_tap && !scroll.auto && last_scroll.dy != null) {
    log.debug(`touch_end(): starting auto`);
    stop_all(ev);
    scroll.auto = true;
    scroll.smooth = last_scroll.smooth;
    scroll.dy = last_scroll.dy;
    start_auto(ev);
  }
  // Tap when auto scrolling stops and preserves settings.
  else if (is_tap) {
    log.debug(`touch_end(): stop and preserve`);
    stop_all(ev);
  }
  // Anything else just records the current scroll values and stops scrolling.
  else {
    last_scroll.auto = false; // scroll.auto;
    last_scroll.smooth = scroll.smooth;
    if (scroll.smooth) {
      last_scroll.dy = scroll.desktop_dy;
    }
    else {
      last_scroll.dy = scroll.dy;
    }
    stop_all(ev);
  }

  sync_indicator(ev);
}

export function stop_all(ev)
{
  log.debug('stop_all()')
  stop_smooth(ev);
  stop_wheel(ev);
  reset_scroll();
  sync_indicator(ev);
}

function stop_smooth(ev)
{
  if (scroll.smooth) {// && scroll.active) {
    middle_up_down('up');
    ws.send('touch', 0, -scroll.desktop_dy.toFixed());
    log.debug(ev, 'Released middle mouse button');
    log.debug(ev, 'Stopped smooth scroll');
  }
}

function stop_wheel(ev)
{
  if (!scroll.smooth && scroll.active) {
    stop_interval_timer(ev);
    log.debug('Stopped wheel scroll');
  }
}

function handle_touch_move(ev)
{
  log.debug(ev, 'handle_touch_move()');

  scroll.speed = get_scroll_speed(ev)
  scroll.dy = touch.get_delta(ev).y;

  if (scroll.smooth) {
    const int_dy = (scroll.dy - scroll.last_dy) * Math.abs(scroll.speed);
    ws.send('touch', 0, int_dy.toFixed());
    scroll.desktop_dy += int_dy;
  }
  else {
  }
  sync_indicator(ev);
  scroll.last_dy = scroll.dy;
}

function start_interval_timer(ev)
{
  if (scroll.interval_handle) {
    return;
  }
  scroll.interval_start_ts = Date.now();
  scroll.interval_handle = setInterval(handle_interval_timer, settings.SCROLL_INTERVAL_MS);
}

function handle_interval_timer()
{
  if ((Date.now() - scroll.interval_start_ts) / 1000 >= (1.0 / Math.abs(scroll.speed))) {
    ws.send('scroll', Math.sign(scroll.speed));
    scroll.interval_start_ts = Date.now();
  }
}

function stop_interval_timer(ev)
{
  if (!scroll.interval_handle) {
    return;
  }
  clearInterval(scroll.interval_handle);
  scroll.interval_handle = null;
  log.debug('Stopped interval timer');
}

function get_scroll_speed(ev)
{
  if (scroll.smooth) {
    return get_smooth_scroll_speed(ev);
  }
  else {
    return get_wheel_scroll_speed(ev);
  }
}

// For browser scroll, the scroll speed is determined by how far the mouse pointer has
// moved from the point where the middle mouse click started, on the desktop.
function get_smooth_scroll_speed(ev)
{
  return scroll.dy * settings.SMOOTH_SCROLL_SENSITIVITY;
}

// For wheel scroll, the scroll speed is determined by how far the touch has moved on
// the tablet touch screen.
function get_wheel_scroll_speed(ev)
{
  return scroll.dy * settings.WHEEL_SCROLL_SENSITIVITY;
}

function sync_indicator(ev)
{
  log.debug(ev, `sync_indicator()`);
  const left = scroll_el.offset().left;
  const tip_el = $('#scroll-tip');
  tip_el
      .text(format_speed(ev))
      .toggleClass('visible', scroll.active || scroll.auto)
      .toggleClass('highlight', scroll.auto)
      .css('top', `${touch.get_pos_time(ev).y - tip_el.outerHeight()}px`)
      .css('left', `${left - tip_el.outerWidth()}px`);
}

function format_speed(ev)
{
  const speed_float = get_scroll_speed(ev);
  return `${speed_float < 0 ? '\u25b2' : '\u25bc'} ` +
      `${Math.abs(speed_float).toFixed(2)}` +
      `${(scroll.smooth ? '' : 'Hz')}`;
}

// In Firefox, auto scroll is toggled on and off with middle mouse button clicks, or toggled on
// while the middle mouse button is being held down. The browser provides feedback on when the auto
// scroll is enabled by changing the mouse icon. Since this app can't see the icon, toggling auto
// scroll on and off would go out of sync if one click is missed. So we want to enable auto scroll
// with long middle mouse button press. For that to work reliably, we need to ensure that we don't
// submit button up and down events that are interpreted as clicks. To that end, we include mouse
// movements with the button up and down events.
function middle_up_down(s)
{
  let wiggle_pixels = 25;
  let delay_ms = 10;
  ws.send('sleep', delay_ms);
  ws.send('middle', s);
  ws.send('sleep', delay_ms);
  ws.send('touch', 0, wiggle_pixels);
  ws.send('sleep', delay_ms);
  ws.send('touch', 0, -wiggle_pixels * 2);
  ws.send('sleep', delay_ms);
  ws.send('touch', 0, wiggle_pixels);
}
