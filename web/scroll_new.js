// This is a new version I started for Alt+Wheel scrolling in Firefox, as described below. But when
// I press Alt manually to try it out, it's not working well. I think it's sending too many events.
//
// TODO: Split up the wheel and browser scroll implementations. They're too different to be combined
// well. The result is just confusing. This single method implementation would be a good start on
// that.

'use strict';

// language=markdown

/*
#### Browser smooth scrolling (2)

Type `about:config` in the address bar, use the search box to find the following settings and modify them:

  - `mousewheel.with_alt.action` to 1  (Default is 2)
    - For reference: `0=Unassigned`, `1=Scroll`, `2=History`, `3=Zoom`.

  - `mousewheel.with_alt.delta_multiplier_x` to `1` (Default is 100)
*/

import * as settings from './settings.js';
import * as touch from './touch.js';
import * as ws from './ws.js';
import * as util from './util.js';
import * as log from './log.js';

// Exported

export function register_event_handlers()
{
  $('#smooth-scroll-toggle').on('click', (ev) => {
    state.smooth_toggle = !state.smooth_toggle;
    $(ev.currentTarget).toggleClass('highlight', state.smooth_toggle);
    if (state.smooth_toggle) {
      log.status('Using Alt+Wheel scrolling');
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
const state = {
  smooth_toggle: false,
  y: 0,
  dy: 0,
  active: false,
  auto: false,
  interval_handle: null,

  last_y: null,
  last_dy: null,
};

const scroll_el = $('#scroll');
const tip_el = $('#scroll-tip');

// When we handle touch_start, we don't yet know if the touch will be a touch or a tap.
// We start out handling it as a touch. At touch_end, we determine if it was a touch
// or a tap, and, on tap, start auto scrolling.
function handle_touch_start(ev)
{
  log.debug('handle_touch_start()');
  start(ev);
}

function handle_touch_end(ev)
{
  log.debug('handle_touch_end()');

  let is_tap = touch.is_tap(ev);
  let is_auto = state.auto;

  let y = state.y;
  let dy = state.dy;

  stop();

  if (is_tap) {
    if (is_auto) {
      log.debug('- tap & auto');
      // Tap when already auto scrolling: Stop the scrolling (which we did already)
    }
    else {
      // Tap when not auto scrolling: User wants to start auto
      if (state.last_dy == null) {
        // Tap with no previous scroll setting: Ignore attempt to start auto.
        log.debug('- tap, no prev scroll');
      }
      else {
        // Tap with previous scroll recorded: Start auto
        log.debug('- tap, with prev scroll');
        start_auto(ev);
      }
    }
  }
  else {
    log.debug('- hold, recording current');
    // Touch was a hold. Record the scroll settings.
    state.last_y = y;
    state.last_dy = dy;
  }

  sync_touch(ev);
  sync_indicator();
}

function handle_touch_move(ev)
{
  sync_touch(ev);
  sync_indicator();
}

////

function start(ev)
{
  log.debug('start()');
  start_interval_timer();
  state.active = true;
  sync_touch(ev);
  sync_indicator();
}

function start_auto(ev)
{
  log.debug('start_auto()');
  start(ev);
  state.auto = true;
  state.y = state.last_y;
  state.dy = state.last_dy;
  sync_indicator();
}

export function stop()
{
  log.debug('stop()');
  stop_interval_timer();
  state.auto = false;
  state.active = false;
  state.y = null;
  state.dy = null;
  sync_indicator();
}

function sync_touch(ev)
{
  log.debug('sync_touch()');
  state.y = touch.get_pos_time(ev).y;
  state.dy = touch.get_delta(ev).y;
}

function start_interval_timer()
{
  if (!state.interval_handle) {
    log.debug('start_interval_timer()');
    state.interval_handle = setInterval(
        handle_interval_timer, settings.SCROLL_INTERVAL_MS
    );
  }
}

function stop_interval_timer()
{
  if (state.interval_handle) {
    log.debug('stop_interval_timer()');
    clearInterval(state.interval_handle);
    state.interval_handle = null;
  }
}

function handle_interval_timer()
{
  let speed = get_scroll_speed();
  log.info(`scroll ${speed}`);
  ws.send('scroll', speed.toFixed(3));
}

function get_scroll_speed()
{
  return state.dy * settings.WHEEL_SCROLL_SENSITIVITY;
}

function sync_indicator()
{
  const left = scroll_el.offset().left;
  tip_el
      .text(format_speed())
      .toggleClass('visible', state.active || state.auto)
      .toggleClass('highlight', state.auto)
      .css('top', `${state.y - tip_el.outerHeight()}px`)
      .css('left', `${left - tip_el.outerWidth()}px`);
}

function format_speed()
{
  const speed_float = get_scroll_speed();
  return `${speed_float < 0 ? '\u25b2' : '\u25bc'} ` +
      `${Math.abs(speed_float).toFixed(2)} Hz`;
}
