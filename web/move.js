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
    .on(util.event_start(), (ev) => {
      handle_move_start(ev);
      return util.stop(ev);
    })
    .on(util.event_end(), (ev) => {
      handle_move_end(ev);
      return util.stop(ev);
    })
    .on(util.event_move(), (ev) => {
      // Ignore mousemove (hover) events unless mouse button is down.
      if (touch.is_active(ev)) {
        handle_touch_move(ev);
        return;
      }
      return util.stop(ev);
    });
}

// Local

let pos_list = [];

function handle_move_start(ev) {
  // Start coordinates for this touch have been captured by the touch tracker.
  log.debug(ev, 'handle_move_start()');
  scroll.stop_all(ev);
  pos_list = [];
  const abs_pos = touch.get_pos_time(ev, 'move');
  pos_list.push(abs_pos);
  spin_stop();
}

function handle_move_end(ev) {
  log.debug(ev, 'handle_move_end()');
  log.debug(`pos_list.length = ${pos_list.length}`);

  draw_clear_later();

  if (touch.is_tap(ev)) {
    return;
  }

  if (pos_list.length < 3) {
    // draw_no_spin(abs_pos);
    return;
  }

  let i = pos_list.length - 1;
  let last = pos_list[i];
  const spin_pos = find_spin_start();
  const spin_vec = get_vector(spin_pos, last);

  if (spin_vec.speed < settings.SPIN_SPEED_THRESHOLD) {
    draw_no_spin(last);
    return;
  }

  const speed = spin_vec.speed * 100;
  spin_start(last, spin_vec.unit.x * speed, spin_vec.unit.y * speed);

  // Start fresh with new history. We do this both here and in the handler for touchstart. That's
  // because we apparently can't rely on a perfect sequence of touch start/move/end events. We can
  // get two end events without a start event between, etc. Probably because the system is set up to
  // handle multiple concurrent touches while we only use one.
  pos_list = [];
}

// See the implementation notes in the README.md for notes on this method.
function find_spin_start() {
  let best_period = 0;
  let j = pos_list.length - 1;

  let p1 = pos_list[j];
  let p2 = pos_list[j - 1];
  let p3 = pos_list[j - 2];

  for (; j >= 2; --j) {
    p1 = pos_list[j];
    p2 = pos_list[j - 1];
    p3 = pos_list[j - 2];

    // Speed heuristic
    const period1 = p1.ts - p2.ts;
    const period2 = p2.ts - p3.ts;
    if (
      period1 < best_period * settings.SPIN_SPEED_TOLERANCE ||
      period2 < best_period * settings.SPIN_SPEED_TOLERANCE
    ) {
      log.debug(`Spin input found by speed heuristic`);
      break;
    }
    if (period1 > best_period) {
      best_period = period1;
    }
    if (period2 > best_period) {
      best_period = period2;
    }

    // Angle heuristic
    const angle = util.get_angle(p1.x, p1.y, p2.x, p2.y, p2.x, p2.y, p3.x, p3.y);
    if (Math.abs(angle) > settings.SPIN_ANGLE_TOLERANSE_DEG) {
      log.debug(`Spin found by angle heuristic`);
      break;
    }
  }

  log.debug(`Spin start found at j=${j} len=${pos_list.length}`);

  // Draw the section of history that we may use for a spin.
  draw_trace(pos_list.slice(j - 2), '#8c2643', 5);
  // draw.circle(ctx, p1.x, p1.y, 6, null, '#902090');
  // draw.circle(ctx, p3.x, p3.y, 6, null, '#902090');

  return p3;
}

function get_vector(first_pos, last_pos) {
  const dx = last_pos.x - first_pos.x;
  const dy = last_pos.y - first_pos.y;
  const length = util.vector_length(dx, dy);
  const elapsed_ms = last_pos.ts - first_pos.ts;
  const speed = length / elapsed_ms;
  const unit = util.unit_vector(dx, dy);
  return {unit: unit, length: length, speed: speed};
}

function handle_touch_move(ev) {
  log.debug(ev, 'handle_touch_move()');
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

  pos_list.push(abs_pos);
  if (pos_list.length > 100) {
    pos_list.shift();
  }
  draw_trace(pos_list);
  // log.debug(ev, `pos_list.length=${pos_list.length}`);
}

function spin_start(abs_pos, dx, dy) {
  log.debug(`spin_start(): dx=${dx} dy=${dy}`);
  draw_spin(abs_pos.x, abs_pos.y, dx, dy);
  ws.send('spin', dx.toFixed(3), dy.toFixed(3));
}

function spin_stop() {
  ws.send('spin', 0, 0);
}

// Draw indicators

const ctx = draw.get_ctx('runes');

function draw_trace(pos_list, stroke_style = '#323e86', line_width = 5) {
  draw.trace(ctx, pos_list, stroke_style, line_width);
}

function draw_clear_now() {
  draw.clear_now(ctx);
}

function draw_clear_later() {
  draw.clear_later(ctx);
}

// Draw indication of a speed that was too low to cause a spin.
function draw_no_spin(abs_pos) {
  draw_clear_later();
  draw.circle(ctx, abs_pos.x, abs_pos.y, 20, '#2b0e0e', '#501a1a');
}

// Draw touch position.
function draw_pos(x, y) {
  draw_clear_now();
  draw.circle(ctx, x, y, 100, '#1b471b');
}

const VECTOR_SIZE_FACTOR = 0.8;
const VECTOR_LINE_WIDTH_FACTOR = 0.1;
const VECTOR_BORDER_WIDTH_FACTOR = 0.7;
const VECTOR_BORDER_COLOR = '#2c397b';
const VECTOR_FILL_COLOR = '#3a499d';

// Draw indication of spin speed and direction.
function draw_spin(x, y, dx, dy) {
  draw_clear_later();
  let mag = util.calc_distance(dx, dy);
  draw.vector(
    ctx,
    x,
    y,
    dx * VECTOR_SIZE_FACTOR,
    dy * VECTOR_SIZE_FACTOR,
    VECTOR_BORDER_COLOR,
    mag * VECTOR_LINE_WIDTH_FACTOR
  );
  draw.vector(
    ctx,
    x,
    y,
    dx * VECTOR_SIZE_FACTOR,
    dy * VECTOR_SIZE_FACTOR,
    VECTOR_FILL_COLOR,
    mag * VECTOR_LINE_WIDTH_FACTOR * VECTOR_BORDER_WIDTH_FACTOR
  );
}
