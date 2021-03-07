// Mouse move and buttons

'use strict';

import * as settings from './settings.js';
import * as ws from './ws.js';
import * as touch from './touch.js';
import * as log from './log.js';
import * as util from './util.js';

// Exported

export function register_event_handlers() {
  log.debug('buttons.register_event_handlers()');

  $('#left,#middle,#right') // $('#left,#middle,#right')
    .on('mousedown touchstart', (ev) => {
      handle_touch_start(ev, ev.currentTarget.id);
      return util.stop(ev);
    })
    .on('mouseup touchend', (ev) => {
      if (g_state) {
        handle_touch_end(ev);
      }
      return util.stop(ev);
    })
    .on('mousemove touchmove', (ev) => {
      handle_touch_move(ev);
      return util.stop(ev);
    });

  // Left-click with tap in the Move area.
  if (settings.TOUCH_LEFT_CLICK) {
    $('#move') // .on('mouseup touchend touchcancel', (ev) => {
      .on('touchend', (ev) => {
        if (touch.is_tap(ev)) {
          handle_touch_start(ev, 'left');
          handle_touch_end(ev);
          return util.stop(ev);
        }
      });
  }

  for (let name of ['left', 'middle', 'right']) {
    g_dict[name] = {
      name: name,
      hold: false,
      toggle: false,
      hold_timer: null,
    };
  }
}

// Local

let g_state = null;
let g_dict = {};

function handle_touch_start(ev, name) {
  log.debug(ev, 'handle_touch_start()');
  if (g_state !== null) {
    handle_touch_end(ev);
  }
  g_state = g_dict[name];
  // We want the mouse toggle to occur while the touch is being held, so the method we use
  // elsewhere, where we check if a touch should be handled as a click or toggle at the time of
  // release is not sufficient here. Instead, we start a timer that triggers at the time that the
  // touch turns into a toggle.
  g_state.hold_timer = setTimeout(toggle, settings.TAP_DURATION_MS, ev);
  g_state.hold = true;
  sync_classes();
}

function handle_touch_move(ev) {
  // If touch has moved too far to be a valid tap or hold, we ignore it (it's probably a swipe that happened to
  // go into the button area).
  if (!touch.is_within_tap_radius(ev)) {
    release(ev);
  }
}

function handle_touch_end(ev) {
  log.debug(ev, 'handle_touch_end()');
  if (touch.is_tap(ev)) {
    tap();
  }
}

function tap() {
  log.debug('tap()');
  // If the tapped button is toggled, the tap only untoggles it.
  if (g_state == null) {
    return;
  }
  if (g_state.toggle) {
    toggle();
  } // If the tapped button was not toggled, it is clicked.
  else {
    ws.send(g_state.name, 'click');
  }
  release();
}

function toggle() {
  log.debug('toggle()');
  g_state.toggle = !g_state.toggle;
  ws.send(g_state.name, g_state.toggle ? 'down' : 'up');
  release();
}

function release() {
  if (g_state == null) {
    return;
  }
  if (g_state.hold_timer) {
    clearTimeout(g_state.hold_timer);
    g_state.hold_timer = null;
  }
  g_state.hold = false;
  sync_classes();
  g_state = null;
}

function sync_classes() {
  log.debug('sync_classes()');
  const l = document.getElementById(g_state.name).classList;
  // l.toggle('button-touch', g_state.hold);
  l.toggle('highlight', g_state.toggle);
}
