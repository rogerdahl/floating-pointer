// Scrolling

/*
Modes

In mouse wheel mode, the scroller generates a series of up or down scroll events at a frequency
selected by the user. The events correspond to the notches that one usually feels when turning a
real scroll wheel.

In browser smooth scroll mode, the scroller just holds down the middle mouse button and moves the
mouse pointer slightly up and down to adjust the scroll speed.

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

export function register_event_handlers() {
  log.debug('scroll.register_event_handlers()');
  // $('#smooth-scroll-toggle').on('click', (ev) => {
  $('#smooth-scroll-toggle').on('mouseup touchend', (ev) => {
    state.smooth_toggle = !state.smooth_toggle;
    $(ev.currentTarget).toggleClass('smooth-highlight', state.smooth_toggle);
    $('#status').toggleClass('smooth-highlight', state.smooth_toggle);
    if (state.smooth_toggle) {
      log.status('Using browser smooth scrolling');
    } else {
      log.status('Using mouse wheel scrolling');
    }
    return util.stop(ev);
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
    .on(
      'mousemove touchmove',
      util.rate_limiter((ev) => {
        handle_touch_move(ev);
        return util.stop(ev);
      }, settings.SCROLL_MOVE_RATE_LIMIT_HZ)
    );
}

// State vars for scrolling.
const state = {
  smooth_toggle: false,
};

function reset_scroll() {
  console.assert(state.interval_handle == null);
  // - For wheel scroll, dy is the distance between starting and ending touch positions.
  // - For smooth scroll, dy is the distance between starting and ending mouse cursor position on
  // the desktop machine.
  state.dy = 0;
  // A copy of dy from the previous event. dy is the distance between the point where the touch
  // started and where the touch currently is. It represents how far the touch has been dragged and,
  // together with a couple of constants for the settings, decide the scroll speed.
  state.last_dy = 0;
  // Distance between start point and current point of the mouse pointer on the desktop machine.
  // This can be different from the distance on the tablet due to the cumulative rounding errors
  // described in the header.
  state.desktop_dy = 0;
  // true = Manual scrolling is active and the scroll speed indicator is showing.
  state.active = false;
  // indicated with the scroll.active and scroll.auto flags.
  // true = Smooth or wheel based auto-scroll is going. The scroll speed indicator is showing and is
  // highlighted.
  state.smooth = false;
  // true = The "Smooth" button has been toggled on ; but we may not actually be scrolling. That's
  // scroll.smooth_toggle = false;
  state.auto = false;
  // Handle for the wheel scroll interval timer
  state.interval_handle = null;
  // Point in time when the most recent mouse wheel scroll event ws triggered
  state.interval_start_ts = null;
  // Scroll speed recorded at last move event.
}

reset_scroll();

// End state of previous regular scroll. Used when starting auto scroll.
const last_scroll = {
  auto: false,
  smooth: false,
  // dy==null indicates that auto scroll is not available, as a regular scroll has
  // not yet been done.
  dy: null,
};

const scroll_el = $('#scroll');

// Touch start and stop
// When we handle touch_start, we don't yet know if the touch will be a touch or a tap.
// We start out handling it as a touch. At touch_end, we determine if it was a touch
// or a tap, and, on tap, start auto scrolling.
function handle_touch_start(ev) {
  log.debug(ev, 'handle_touch_start()');
  // TODO: Cant do stop_all() here since it wipes out info about what the previous
  // state was, which we need in order to determine the next step.
  // stop_all(ev)
  state.dy = 0;
  state.last_dy = 0;
  state.smooth = state.smooth_toggle;
  if (state.smooth) {
    start_smooth(ev);
  } else {
    start_wheel(ev);
  }
  state.active = true;
  sync_indicator(ev);
}

function start_smooth(_ev) {
  middle_up_down('down');
  state.desktop_dy = 0;
}

function start_wheel(ev) {
  start_interval_timer(ev);
}

function start_auto(ev) {
  log.debug(ev, 'Starting auto-scroll');
  log.debug(ev, `scroll auto=${state.auto} smooth=${state.smooth} dy=${state.dy} `);
  if (state.smooth) {
    middle_up_down('down');
    ws.send('touch', 0, state.dy.toFixed(3));
  } else {
    start_wheel(ev);
  }
  state.active = true;
  sync_indicator(ev);
}

function handle_touch_end(ev) {
  let is_tap = touch.is_tap(ev);
  // Tap when not auto scrolling starts auto, using previously captured scroll values..
  if (is_tap && !state.auto && last_scroll.dy != null) {
    log.debug(`touch_end(): start auto`);
    stop_all(ev);
    state.auto = true;
    state.smooth = last_scroll.smooth;
    state.dy = last_scroll.dy;
    start_auto(ev);
  }
  // Tap when auto scrolling just stops scrolling. Scroll values are already captured.
  else if (is_tap) {
    log.debug(`touch_end(): stop only`);
    stop_all(ev);
  }
  // Release after drag stops scrolling and captures the scroll values that were in use at the time
  // of release.
  else {
    log.debug(`touch_end(): stop and capture`);
    last_scroll.auto = false; // scroll.auto;
    last_scroll.smooth = state.smooth;
    if (state.smooth) {
      last_scroll.dy = state.desktop_dy;
    } else {
      last_scroll.dy = state.dy;
    }
    stop_all(ev);
  }

  sync_indicator(ev);
}

export function stop_all(ev) {
  // log.debug('stop_all()');
  stop_smooth(ev);
  stop_wheel(ev);
  reset_scroll();
  sync_indicator(ev);
}

function stop_smooth(ev) {
  if (state.smooth) {
    // && scroll.active) {
    middle_up_down('up');
    ws.send('touch', 0, -state.desktop_dy.toFixed());
    log.debug(ev, 'Released middle mouse button');
    log.debug(ev, 'Stopped smooth scroll');
  }
}

function stop_wheel(ev) {
  if (!state.smooth && state.active) {
    stop_interval_timer(ev);
    log.debug('Stopped wheel scroll');
  }
}

function handle_touch_move(ev) {
  // log.debug(ev, 'handle_touch_move()');

  state.speed = get_scroll_speed(ev);
  state.dy = touch.get_delta(ev).y;

  if (state.smooth) {
    const int_dy = (state.dy - state.last_dy) * Math.abs(state.speed);
    ws.send('touch', 0, int_dy.toFixed());
    state.desktop_dy += int_dy;
  } else {
  }
  sync_indicator(ev);
  state.last_dy = state.dy;
}

function start_interval_timer(_ev) {
  if (state.interval_handle) {
    return;
  }
  state.interval_start_ts = Date.now();
  state.interval_handle = setInterval(
    handle_interval_timer,
    settings.SCROLL_INTERVAL_MS
  );
}

function handle_interval_timer() {
  if ((Date.now() - state.interval_start_ts) / 1000 >= 1.0 / Math.abs(state.speed)) {
    ws.send('scroll', Math.sign(state.speed));
    state.interval_start_ts = Date.now();
  }
}

function stop_interval_timer(_ev) {
  if (!state.interval_handle) {
    return;
  }
  clearInterval(state.interval_handle);
  state.interval_handle = null;
  log.debug('Stopped interval timer');
}

function get_scroll_speed(ev) {
  if (state.smooth) {
    return get_smooth_scroll_speed(ev);
  } else {
    return get_wheel_scroll_speed(ev);
  }
}

// For browser scroll, the scroll speed is determined by how far the mouse pointer has
// moved from the point where the middle mouse click started, on the desktop.
function get_smooth_scroll_speed(_ev) {
  return state.dy * settings.SMOOTH_SCROLL_SENSITIVITY;
}

// For wheel scroll, the scroll speed is determined by how far the touch has moved on
// the tablet touch screen.
function get_wheel_scroll_speed(_ev) {
  return state.dy * settings.WHEEL_SCROLL_SENSITIVITY;
}

function sync_indicator(ev) {
  log.debug(`active=${state.active} auto=${state.auto}`);
  // log.debug(ev, `sync_indicator()`);
  const left = scroll_el.offset().left;
  const tip_el = $('#scroll-tip');
  tip_el
    .text(format_speed(ev))
    .toggleClass('visible', state.active || state.auto)
    .toggleClass('highlight', state.auto)
    .css('top', `${touch.get_pos_time(ev).y - tip_el.outerHeight()}px`)
    .css('left', `${left - tip_el.outerWidth()}px`);
}

function format_speed(ev) {
  const speed_float = get_scroll_speed(ev);
  return (
    `${speed_float < 0 ? '\u25b2' : '\u25bc'} ` +
    `${Math.abs(speed_float).toFixed(2)}` +
    `${state.smooth ? '' : 'Hz'}`
  );
}

// In Firefox, auto scroll is toggled on and off with middle mouse button clicks, or toggled on
// while the middle mouse button is being held down. The browser provides feedback on when the auto
// scroll is enabled by changing the mouse icon. Since this app can't see the icon, toggling auto
// scroll on and off would go out of sync if one click is missed. So we want to enable auto scroll
// with long middle mouse button press. For that to work reliably, we need to ensure that we don't
// submit button up and down events that are interpreted as clicks. To that end, we include mouse
// movements with the button up and down events.
function middle_up_down(s) {
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
