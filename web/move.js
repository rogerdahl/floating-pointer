// Mouse movement

'use strict';

import * as touch from './touch.js';
import * as ws from './ws.js';
import * as scroll from './scroll.js';
import * as log from './log.js';
import * as util from './util.js';
import * as settings from './settings.js';
import * as draw from './draw.js';

// Exported

export function register_event_handlers() {
  log.debug('move.register_event_handlers()');
  $('#move')
    .on('mousedown touchstart', (ev) => {
      handle_move_start(ev);
      return util.stop(ev);
    })
    .on('mouseup touchend', (ev) => {
      handle_move_end(ev);
      return util.stop(ev);
    })
    .on('mousemove touchmove', (ev) => {
      // Ignore mousemove (hover) events unless mouse button is down.
      if (touch.is_active(ev)) {
        handle_touch_move(ev);
        return;
      }
      return util.stop(ev);
    });
}

// Local

let last_moves = [];

function handle_move_start(ev) {
  // Start coordinates for this touch have been captured by the touch tracker.
  log.debug(ev, 'handle_move_start()');
  scroll.stop_all(ev);
  last_moves = [];
  const abs_pos = touch.get_pos_time(ev, 'move');
  last_moves.push(abs_pos);
  spin_stop();
}

function handle_move_end(ev) {
  log.debug(ev, 'handle_move_end()');
  draw.clear();
  const abs_pos = touch.get_pos_time(ev, 'move');
  if (last_moves.length < 2) {
    no_spin(abs_pos);
    return;
  }
  // TODO: This should be time based, not based on number of move events.
  let f = last_moves.length > 10 ? 10 : last_moves.length;
  let first = last_moves[last_moves.length - f];
  let last = last_moves[last_moves.length - 1];
  let dx = last.x - first.x;
  let dy = last.y - first.y;
  let speed = util.calc_distance(dx, dy);
  if (speed < settings.SPIN_SPEED_THRESHOLD) {
    no_spin(abs_pos);
    return;
  }
  spin_start(abs_pos, dx, dy);
}

function handle_touch_move(ev) {
  // log.debug(ev, 'handle_touch_move()');
  const rel_pos = touch.get_delta(ev, 'move');
  util.rate_limiter(
    ws.send(
      'touch',
      (rel_pos.x * settings.TOUCH_MOVE_SENSITIVITY).toFixed(3),
      (rel_pos.y * settings.TOUCH_MOVE_SENSITIVITY).toFixed(3)
      // acceleration_curve(dx, TOUCH_SENSITIVITY),
      // acceleration_curve(dy, TOUCH_SENSITIVITY),
    ),
    settings.MOUSE_MOVE_RATE_LIMIT_HZ
  );
  const abs_pos = touch.get_pos_time(ev, 'move');
  draw_pos(abs_pos.x, abs_pos.y);

  last_moves.push(abs_pos);
  if (last_moves.length > 100) {
    last_moves.shift();
  }
  draw.trace(last_moves);
  log.debug(ev, `last_moves.length=${last_moves.length}`);
}

function spin_start(abs_pos, dx, dy) {
  log.debug(`spin_start(): dx=${dx} dy=${dy}`);
  // draw.draw_trace(last_moves);
  draw_spin(abs_pos.x, abs_pos.y, dx, dy);
  ws.send('spin', dx.toFixed(3), dy.toFixed(3));
}

function spin_stop() {
  ws.send('spin', 0, 0);
}

function no_spin(abs_pos) {
  draw_stop(abs_pos);
}

// Draw indicators

// Draw touch position.
function draw_pos(x, y) {
  draw.clear();
  draw.circle(x, y, 100, '#1b471b');
}

// Draw indication of a speed that was too low to cause a spin.
function draw_stop(abs_pos) {
  draw.clear();
  draw.circle(abs_pos.x, abs_pos.y, 20, '#501a1a', '#501a1a');
}

// Draw indication of spin speed and direction.
function draw_spin(x, y, dx, dy) {
  draw.clear();
  let mag = util.calc_distance(dx, dy);
  const VECTOR_SIZE_FACTOR = 0.8;
  const VECTOR_LINE_WIDTH_FACTOR = 0.07;
  draw.vector(
    x,
    y,
    dx * VECTOR_SIZE_FACTOR,
    dy * VECTOR_SIZE_FACTOR,
    '#606060',
    mag * VECTOR_LINE_WIDTH_FACTOR
  );
}
