// Canvas

'use strict';

import * as log from './log.js';

let canvas = document.getElementById('overlay');
let ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

export function clear() {
  log.debug('clear()');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function trace(pos_list) {
  let is_first = true;
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#404040';
  for (let pos of pos_list) {
    if (is_first) {
      is_first = false;
      ctx.moveTo(pos.x, pos.y);
      continue;
    }
    ctx.lineTo(pos.x, pos.y);
  }
  ctx.stroke();
}

export function circle(x, y, radius = 50, stroke_style = null, fill_style = null) {
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
export function vector(x, y, dx, dy, stroke_style = '#4c2466', line_width = 10) {
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
