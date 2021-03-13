// Canvas

'use strict';

import * as settings from './settings.js';
import * as util from './util.js';
import * as log from './log.js';

let clear_handler = null;

export function get_ctx(canvas_id) {
  let canvas = document.getElementById(canvas_id);
  let ctx = canvas.getContext('2d');
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
  return ctx;
}

export function clear_now(ctx) {
  if (clear_handler != null) {
    clearTimeout(clear_handler);
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function clear_later(ctx) {
  if (clear_handler != null) {
    clearTimeout(clear_handler);
  }
  clear_handler = setTimeout(clear_now, 1000, ctx);
}

export function trace(ctx, pos_list, stroke_style = '#323e86', line_width = 5) {
  // if (!settings.ENABLE_MYSTERY_RUNES) {
  //   return;
  // }
  ctx.beginPath();
  ctx.moveTo(pos_list[0].x, pos_list[0].y);
  ctx.lineWidth = line_width;
  ctx.strokeStyle = stroke_style;
  for (let pos of pos_list.slice(1)) {
    ctx.lineTo(pos.x, pos.y);
  }
  ctx.stroke();
}

export function circle(ctx, x, y, radius = 50, stroke_style = null, fill_style = null) {
  // if (!settings.ENABLE_MYSTERY_RUNES) {
  //   return;
  // }
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  if (stroke_style != null) {
    ctx.strokeStyle = stroke_style;
    ctx.stroke();
  }
  if (fill_style != null) {
    ctx.fillStyle = fill_style;
    ctx.fill();
  }
}

// Draw a vector.
export function vector(ctx, x, y, dx, dy, stroke_style = '#4c2466', line_width = 10) {
  // if (!settings.ENABLE_MYSTERY_RUNES) {
  //   return;
  // }
  ctx.strokeStyle = stroke_style;
  ctx.lineWidth = line_width;
  // Head shape
  const head_to_length_ratio = 0.3;
  const head_flare = 6;
  //
  const to_x = x + dx;
  const to_y = y + dy;
  const head_length = Math.sqrt(dx * dx + dy * dy) * head_to_length_ratio;
  const angle = Math.atan2(dy, dx);
  // Arrow line
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(to_x, to_y);
  ctx.stroke();
  // Arrow head
  ctx.beginPath();
  const flare_pi = Math.PI / head_flare;
  ctx.moveTo(
    to_x - head_length * Math.cos(angle - flare_pi),
    to_y - head_length * Math.sin(angle - flare_pi)
  );
  ctx.lineTo(to_x, to_y);
  ctx.lineTo(
    to_x - head_length * Math.cos(angle + flare_pi),
    to_y - head_length * Math.sin(angle + flare_pi)
  );
  ctx.stroke();
}

export function star(
  ctx,
  x,
  y,
  dia,
  stroke_style = '#125a59',
  line_width = 2,
  angle_start = 0,
  angle_add = Math.PI / 6
) {
  // if (!settings.ENABLE_MYSTERY_RUNES) {
  //   return;
  // }
  ctx.strokeStyle = stroke_style;
  ctx.lineWidth = line_width;
  ctx.beginPath();
  let angle = angle_start;
  while (angle < 2 * Math.PI + angle_start) {
    const c = dia * Math.cos(angle);
    const s = dia * Math.sin(angle);
    ctx.moveTo(x, y);
    ctx.lineTo(x - c, y - s);
    angle += angle_add;
  }
  ctx.stroke();
}
