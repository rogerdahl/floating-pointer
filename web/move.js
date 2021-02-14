// Mouse movement

'use strict';

import * as touch from './touch.js';
import * as ws from './ws.js';
import * as scroll from './scroll.js';
import * as log from './log.js';
import * as util from './util.js';
import * as settings from './settings.js';

// Exported

export function register_event_handlers()
{
  log.debug('move.register_event_handlers()');
  $('#move')
      .on('mousedown touchstart', (ev) => {
        handle_move_start(ev);
        return util.stop(ev);
      })
      .on('mouseup touchend', util.rate_limiter((ev) => {
        handle_move_end(ev);
        return util.stop(ev);
      }, 120))
      .on('mousemove touchmove', util.rate_limiter((ev) => {
        // Ignore mousemove (hover) events unless mouse button is down.
        if (!touch.is_active(ev)) {
          return; // true;
        }
        handle_touch_move(ev);
        return util.stop(ev);
      }, settings.MOUSE_MOVE_RATE_LIMIT_HZ))
  // .on('mousemove touchmove', util.limit_event_rate((ev) => {
  //   // Ignore mousemove (hover) events unless mouse button is down.
  //   if (!touch.is_active(ev)) {
  //     return; // true;
  //   }
  //   handle_touch_move(ev);
  //   return util.stop(ev);
  // }, settings.MOUSE_MOVE_RATE_LIMIT_HZ))
  ;
}

// Local

function handle_move_start(ev)
{
  log.debug(ev, '-----------------');

  log.debug(ev, 'handle_move_start()');
  // Start coordinates for this touch have been captured by the touch tracker.

  scroll.stop_all(ev);

  last_moves = [];
  // if (smooth_toggle) {
  //     start_browser_smooth();
  // } else {
  //     start_interval_timer(ev);
  // }
  // scroll.active = true;
  // // scroll.auto_active = false;
  // // adjust_scroll_speed(ev);
  // sync_indicator(ev, 0);
  const abs_pos = touch.get_pos_time(ev, 'move');
  last_moves.push(abs_pos);

}

let last_moves = [];

function handle_move_end(ev)
{
  log.debug(ev, 'handle_move_end()');
  // scroll.stop_all(ev);

  const abs_pos = touch.get_pos_time(ev, 'move');
  last_moves.push(abs_pos);

  log.debug(ev, `last_moves.length=${last_moves.length}`);

  if (last_moves.length > 2) {
    const first = last_moves.pop();
    const last = last_moves.shift();

    log.debug(ev, 'first', first);
    log.debug(ev, 'last', last);

    let x = first.x - last.x;
    let y = first.y - last.y;

    log.debug(ev, `spin: x=${x} y=${y}`);

    if (Math.abs(x) < 30 && Math.abs(y) < 30) {
      x = 0;
      y = 0;
      log.debug(ev, 'Stopped slow movement');
    }

    ws.send('spin', x.toFixed(3), y.toFixed(3));
  }
}

function handle_touch_move(ev)
{
  log.debug(ev, 'handle_touch_move()');
  const rel_pos = touch.get_delta(ev, 'move');
  ws.send('touch',
      (rel_pos.x * settings.TOUCH_MOVE_SENSITIVITY).toFixed(3),
      (rel_pos.y * settings.TOUCH_MOVE_SENSITIVITY).toFixed(3),
      // acceleration_curve(dx, TOUCH_SENSITIVITY),
      // acceleration_curve(dy, TOUCH_SENSITIVITY),
  );

  const abs_pos = touch.get_pos_time(ev, 'move');

  last_moves.push(abs_pos);
  if (last_moves.length > 10) {
    last_moves.shift();
  }

  log.debug(ev, `last_moves.length=${last_moves.length}`);
}

