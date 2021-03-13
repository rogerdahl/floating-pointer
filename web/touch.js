// Global touch event tracker

'use strict';

import * as settings from './settings.js';
import * as log from './log.js';
import * as util from './util.js';
import {assert} from './util.js';
import * as draw from './draw.js';

// Exported

export function register_passive_handlers() {
  // Replace the regular jQuery event registration methods with versions that register
  // passive listeners.
  // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
  //
  jQuery.event.special.touchstart = {
    setup: function (_, ns, handle) {
      this.addEventListener(util.event_start(), handle, {
        passive: !ns.includes('noPreventDefault'),
      });
    },
  };
  jQuery.event.special.touchmove = {
    setup: function (_, ns, handle) {
      this.addEventListener(util.event_move(), handle, {
        passive: !ns.includes('noPreventDefault'),
      });
    },
  };
  jQuery.event.special.touchend = {
    setup: function (_, ns, handle) {
      this.addEventListener(util.event_end(), handle, {
        passive: !ns.includes('noPreventDefault'),
      });
    },
  };
}

// Call before registering any other handlers for touch or mouse events.
export function register_start_handler() {
  log.debug('touch.register_start_handler()');
  // To ensure that this event is triggered before all other touch events, we bind it to the document capture
  // phase. jQuery can only bind events in the bubble phase, where events on document fire last, so we use
  // addEventListener() directly.
  // for (const type_str of ['mousedown', 'touchstart']) {
  document.addEventListener(
    util.event_start(),
    function (ev) {
      handle_global_start(ev);
      // ev.stopImmediatePropagation();
      return util.stop(ev);
      // return true;
    },
    // true
    {passive: true}
  );
  // }
}

// Call after registering all other handlers for touch or mouse events.
export function register_end_handler() {
  log.debug('touch.register_end_handler()');
  // We bind this event to the document bubble phase, which should ensure that it is triggered
  // after all other touch events.
  $(document).on(util.event_end(), function (ev) {
    handle_global_end(ev);
    // ev.stopImmediatePropagation();
    // return util.stop(ev);
    return true;
  });
}

export function is_active(ev) {
  assert_ev(ev);
  const is_active_ = touch_map.size > 0;
  // log.debug(ev, `is_active() -> ${is_active_}`);
  return is_active_;
}

export function get_distance(ev, delta_key = '') {
  assert_ev(ev);
  let delta_pos = get_delta(ev, delta_key);
  return util.calc_distance(delta_pos.x, delta_pos.y, 2);
}

export function get_start_pos(ev) {
  assert_ev(ev);
  if (!touch_map.has('')) {
    log.debug(ev, 'Start of touch has not been registered (mouse hover in browser?)');
    touch_map.set('', get_pos_time(ev));
  }
  const p = touch_map.get('');
  // log.debug(`get_start_pos() '' -> ${p}`);
  return p;
}

/*
 Get the delta x, y positions and time (float seconds) since a previously recorded position and time.
 - delta_key unset or set to '': Delta is been current and start of touch.
 - delta_key set, first call with key: Delta is between current and start of touch.
 - delta_key set, calls with previously used key: Delta is between current and the position and time that was current
 on the previous call with the same key.
*/
export function get_delta(ev, delta_key = '') {
  // log.debug(ev, `get_delta() delta_key=${delta_key}`)
  assert_ev(ev);
  let prev_pos = touch_map.has(delta_key)
    ? touch_map.get(delta_key)
    : get_start_pos(ev);
  let cur_pos = get_pos_time(ev);
  // log.debug(ev, `get_delta() prev_pos=${prev_pos}, cur_pos=${cur_pos}`);
  const delta_pos = new PosTime(
    cur_pos.x - prev_pos.x,
    cur_pos.y - prev_pos.y,
    cur_pos.ts - prev_pos.ts
  );
  if (delta_key !== '') {
    touch_map.set(delta_key, cur_pos);
  }
  // log.debug(ev, `get_delta() ${delta_key} -> ${delta_pos}`);
  return delta_pos;
}

export function is_within_tap_radius(ev, delta_key = '') {
  assert_ev(ev);
  const is_within_tap_radius = get_distance(ev, delta_key) < settings.TAP_RADIUS_PIXELS;
  // log.debug(ev, `is_within_tap_radius() -> ${is_within_tap_radius}`);
  return is_within_tap_radius;
}

export function is_short_touch(ev, delta_key = '') {
  assert_ev(ev);
  const delta_pos = get_delta(ev, delta_key);
  const is_within_tap_duration = delta_pos.ts < settings.TAP_DURATION_MS;
  // log.debug(ev, `is_within_tap_duration() -> ${is_within_tap_duration}`);
  return is_within_tap_duration;
}

export function is_long_touch(ev, delta_key = '') {
  assert_ev(ev);
  return !is_short_touch(ev, delta_key);
}

export function is_tap(ev, delta_key) {
  assert_ev(ev);
  return is_within_tap_radius(ev, delta_key) && is_short_touch(ev, delta_key);
}

export function is_hold(ev, delta_key) {
  assert_ev(ev);
  return is_within_tap_radius(ev, delta_key) && is_long_touch(ev, delta_key);
}

// Local

class PosTime {
  constructor(x, y, ts = performance.now()) {
    // constructor(x, y, ts = Date.now()) {
    this.x = x;
    this.y = y;
    this.ts = ts;
    // log.debug('PosTime:', this.toJSON());
  }

  get [Symbol.toStringTag]() {
    return `x=${this.x.toFixed(2)}, y=${this.y.toFixed(
      2
    )}, ts=...${this.x.toString().slice(-5)}`;
  }

  toJSON() {
    return {
      x: this.x.toFixed(2),
      y: this.y.toFixed(2),
      ts: `...${this.x.toString().slice(-5)}`,
    };
  }
}

let touch_map = new Map();

function handle_global_start(ev) {
  log.debug(ev, `handle_global_start()`);
  draw.clear_now(draw.get_ctx('runes'));
  touch_map.clear();
  touch_map.set('', get_pos_time(ev));
}

function handle_global_end(ev) {
  log.debug(ev, `handle_global_end()`);
  touch_map.clear();
}

export function get_pos_time(ev) {
  // log.debug(ev, 'get_pos_time()');
  // log.dump_obj_properties('get_pos_time() ev', ev);
  assert_ev(ev);
  if (ev.type === 'touchstart') {
    const t = ev.targetTouches[0];
    return new PosTime(t.clientX, t.clientY);
  } else if (ev.type === 'touchmove') {
    const t = ev.changedTouches[0];
    return new PosTime(t.clientX, t.clientY);
  } else if (ev.type === 'touchend') {
    const t = ev.changedTouches[0];
    return new PosTime(t.clientX, t.clientY);
  } else {
    // log.debug(ev, `Received a mouse event: ${ev.type}`);
    return new PosTime(ev.clientX, ev.clientY);
  }
}

// Return `true` if the element that is currently receiving touch events is also the element under the point being
// touched.
//
// Touch events are bound to the element where the event first started. The element does not receive any events that
// indicate that the touch has left the event boundaries, like pointerout, pointerup, lostpointercapture and
// pointerleave. In general, that's beneficial. For instance, it allows the user to adjust a slider without having to
// stay inside the slider throughout the entire adjustment.
function is_currently_touched_element(ev) {
  log.debug(ev, 'is_currently_touched_element()');
  const pos = get_pos_time(ev);
  const touched_el = document.elementFromPoint(pos.x, pos.y);
  return ev.currentTarget === touched_el;
}

function assert_ev(ev) {
  assert(
    typeof ev.type !== 'undefined',
    `'ev' is missing or wrong object (see call stack)`
  );
}
