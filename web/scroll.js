// Scrolling

// In mouse wheel mode, the scroller generates a series of up or down scroll events at a frequency
// selected by the user. The events correspond to the notches that one usually feels when turning a
// real scroll wheel.
//
// In browser smooth scroll mode, the scroller just holds down the middle mouse button and moves the
// mouse pointer slightly up and down to adjust the scroll speed.
//
// Checking which frequency to scroll at only once per event can be done with a simple loop that
// reads the frequency, waits for the amount of time required for that frequency, then sends the
// events and repeats. But users often scroll at only one or two events per second, and checking the
// user's selection so rarely would probably cause the response to feel sluggish. So this
// implementation uses a different approach, where the user's selection is checked at a constant
// rate (60 Hz by default). At each check, the time interval required for meeting the currently
// selected frequency is compared with the actual time since the last event was generated, and a new
// event is generated if the actual time is longer.

'use strict';

import * as settings from "./settings.js";
import * as touch from "./touch.js";
import * as ws from "./ws.js";
import * as util from "./util.js";
import * as log from "./log.js";

// Exported

export function register_event_handlers()
{
  log.info('scroll.register_event_handlers()');

  $('#smooth-scroll-toggle').on('click', (ev) => {
    // alert(1);
    smooth_toggle = !smooth_toggle;
    $(ev.currentTarget).toggleClass('highlight', smooth_toggle);
    if (smooth_toggle) {
      log.info('Using browser smooth scrolling (see README.md)')
    }
    else {
      log.info('Using mouse wheel scrolling')
    }
  });

  scroll_el
      .on('mousedown touchstart', (ev) => {
        handle_scroll_start(ev);
        return util.stop(ev);
      })
      .on('mouseup touchend', (ev) => {
        handle_scroll_end(ev);
        return util.stop(ev);
      })
      .on('mousemove touchmove', util.rate_limiter((ev) => {
        handle_scroll_move(ev);
        return util.stop(ev);
      }, settings.SCROLL_MOVE_RATE_LIMIT_HZ))

      .on('mousemove touchmove', (ev) => {
        handle_scroll_move(ev);
        return util.stop(ev);
      })
  ;
}

// Local

let scroll = {
  middle_press: false,
  active: false,
  // start_y: null,
  dy: 0,
  last_dy: null,
  auto_dy: null,
  prev_was_tap: false,
  auto_active: false,
  interval_handle: null,
  interval_start_ts: null,
}

scroll.auto_active = false;

let smooth_toggle = false;

const scroll_el = $('#scroll');

function handle_scroll_start(ev)
{
  log.debug(ev, 'handle_scroll_start()');
  // Start coordinates for this touch have been captured by the touch tracker.
  // stop_all(ev);
  if (smooth_toggle) {
    start_middle_press();
  }
  else {
    start_interval_timer(ev);
  }
  scroll.active = true;
  // scroll.auto_active = false;
  // adjust_scroll_speed(ev);
  sync_indicator(ev, 0);
}

function handle_scroll_end(ev)
{
  log.debug(ev, 'handle_scroll_end()');
  // stop_all(ev);
  if (touch.is_tap(ev)) {
    if (scroll.auto_active) {
      stop_all(ev);
    }
    else {
      stop_all(ev);
      start_auto_scroll(ev);
    }
  }
  else {
    scroll.last_dy = touch.get_delta(ev).y;
    log.info(ev, `Tap in scroll area to start auto-scroll @ ${format_speed(scroll.last_dy)}`);
    stop_all(ev);
  }
}

function handle_scroll_move(ev)
{
  log.debug(ev, 'handle_scroll_move()');
  const last_speed = dy_to_smooth_speed(scroll.last_dy);
  const dy = touch.get_delta(ev).y;
  scroll.last_dy = dy;
  let speed = dy_to_smooth_speed(dy);

  if (smooth_toggle) {
    ws.send('touch', 0, Math.round(speed - last_speed));
  }
  sync_indicator(ev, dy);
}

export function stop_all(ev)
{
  log.debug('stop_all()')
  stop_interval_timer(ev);
  end_middle_press(ev);
  scroll.active = false;
  scroll.auto_active = false;
  sync_indicator(ev, 0);
}

// Adjust the scroll speed based on dy.
// Wheel Just record dy.
// Smooth Moves the mouse pointer up or down according to dy.

// function adjust_scroll_speed(ev) {
//     log.debug(ev, 'adjust_scroll_speed()');
//     if (smooth_toggle) {
//         let dy = touch.get_delta(ev, 'scroll').y;
//         ws.send('touch', 0, Math.round(dy * settings.SMOOTH_SCROLL_SENSITIVITY));
//     } else {
//         scroll.dy = touch.get_delta(ev, '').y;
//     }
// }

function start_auto_scroll(ev)
{
  const dy = scroll.last_dy;
  log.info(ev, `Starting auto-scroll @ ${format_speed(dy)}`);
  if (smooth_toggle) {
    start_middle_press(ev);
    ws.send('touch', 0, Math.round(dy_to_smooth_speed(dy)));
  }
  else {
    start_interval_timer(ev);
  }
  scroll.auto_active = true;
  sync_indicator(ev, dy);
}

// Auto

// Browser auto-scroll using middle mouse button.

function start_middle_press(ev)
{
  log.debug(ev, 'start_middle_press() ?');
  if (scroll.middle_press) {
    log.debug(ev, 'middle already pressed');
    return;
  }
  log.info(ev, 'Starting browser auto-scroll (smooth-scroll)');
  // $("#middle").trigger('');
  ws.send('middle down');
  scroll.middle_press = true;
}

function end_middle_press(ev)
{
  log.debug(ev, 'end_middle_press() ?');
  if (!scroll.middle_press) {
    log.debug(ev, 'middle press already ended');
    return;
  }
  log.debug(ev, 'ending middle press');
  ws.send('middle up');
  // log.dump_obj('scroll', scroll);
  // ws.send('touch', 0, -Math.round(dy_to_smooth_speed(scroll.last_dy)));
  // ws.send('touch', 0, -Math.round(dy_to_smooth_speed(scroll.last_dy)));
  ws.send(`touch 0 ${-Math.round(dy_to_smooth_speed(scroll.last_dy))}`);
  scroll.last_dy = 0;
  scroll.middle_press = false;
}

// Interval timer

function start_interval_timer(ev)
{
  log.debug(ev, 'start_interval_timer()');
  if (scroll.interval_handle) {
    log.debug(ev, 'already started');
    return;
  }
  log.debug(ev, 'starting interval timer');
  scroll.interval_start_ts = Date.now();
  scroll.interval_handle = setInterval(handle_interval_timer, settings.SCROLL_INTERVAL_MS);
}

function handle_interval_timer(ev)
{
  // ev doesn't work for getting the current position. Probably because it's not an active event by the time this
  // handler is triggered.
  const step_hz = dy_to_step_hz(scroll.last_dy);
  // log.debug(step_hz);
  if ((Date.now() - scroll.interval_start_ts) / 1000 >= (1.0 / Math.abs(step_hz))) {
    ws.send('scroll', Math.sign(step_hz));
    scroll.interval_start_ts = Date.now();
  }
}

function stop_interval_timer(ev)
{
  log.debug(ev, 'stop_interval_timer() ?');
  if (!scroll.interval_handle) {
    log.debug(ev, 'already stopped');
    return;
  }
  log.debug(ev, 'stopping interval timer')
  clearInterval(scroll.interval_handle);
  scroll.interval_handle = null;
}

// Scroll indicator

function sync_indicator(ev, dy)
{
  log.debug(ev, `sync_indicator()`);
  const left = scroll_el.offset().left;
  const tip_el = $('#scroll-tip');
  tip_el
      .text(format_speed(dy))
      .toggleClass('visible', scroll.active || scroll.auto_active)
      .toggleClass('highlight', scroll.auto_active)
      .css('top', `${touch.get_pos_time(ev).y - tip_el.outerHeight()}px`)
      .css('left', `${left - tip_el.outerWidth()}px`);
}

function format_speed(dy)
{
  const speed_float = dy_to_speed(dy);
  return `${speed_float < 0 ? '\u25b2' : '\u25bc'} ` +
      `${Math.abs(speed_float).toFixed(2)}` +
      `${(smooth_toggle ? '' : 'Hz')}`;
}

// Delta Y to speed.
function dy_to_speed(dy)
{
  if (smooth_toggle) {
    return dy_to_smooth_speed(dy);
  }
  else {
    return dy_to_step_hz(dy);
  }
}


// Delta Y to step scroll frequency.
function dy_to_step_hz(dy)
{
  // let speed_hz = util.acceleration_curve(scroll.dy, settings.SCROLL_SENSITIVITY)
  // log.assert(typeof dy === "number")
  return dy * settings.WHEEL_SCROLL_SENSITIVITY;
}

// Delta Y to smooth scroll speed.
function dy_to_smooth_speed(dy)
{
  // log.assert(typeof dy === "number")
  return dy * settings.SMOOTH_SCROLL_SENSITIVITY;
}
