import * as util from './util.js';
import * as draw from './draw.js';

const REFRESH_RATE_HZ = 60;
const FLAKE_COUNT = 50;

const SIZE_MIN = 10;
const SIZE_MAX = 50;
const RATIO_MIN = 0.3;
const RATIO_MAX = 1.0;

const WIDTH_MIN = 2;
const WIDTH_MAX = 8;

const WIGGLE_MIN = 10;
const WIGGLE_MAX = 50;
const WIGGLE_SPEED_MIN = 0.01;
const WIGGLE_SPEED_MAX = 0.05;

const Y_SPEED_MIN = 0.5;
const Y_SPEED_MAX = 1.5;

const ROT_SPEED_MIN = -0.03;
const ROT_SPEED_MAX = 0.03;

let interval_handle = null;
let timer = new util.Timer(`Snow (${FLAKE_COUNT} flakes)`);
let flake_list = [];

const ctx = draw.get_ctx('snow');

export function start() {
  gen();
  const delay_ms = 1000 * (1 / REFRESH_RATE_HZ);
  setInterval(refresh, delay_ms);
}

export function stop() {
  if (interval_handle != null) {
    clearInterval(interval_handle);
    interval_handle = null;
  }
}

function refresh() {
  timer.start();
  draw_flakes();
  timer.console_limited();
  update();
}

function gen_one() {
  let range = (a, b) => {
    return Math.random() * (b - a) + a;
  };

  const size_a = range(SIZE_MIN, SIZE_MAX);
  const size_b = range(RATIO_MIN, RATIO_MAX);

  return {
    size_a: size_a,
    size_b: size_a * size_b,

    width_a: range(WIDTH_MIN, WIDTH_MAX),
    width_b: range(WIDTH_MIN, WIDTH_MAX),

    x: range(0, window.innerWidth),
    wiggle: range(WIGGLE_MIN, WIGGLE_MAX),
    wiggle_offset: 0,
    wiggle_speed: range(WIGGLE_SPEED_MIN, WIGGLE_SPEED_MAX),

    y: range(0, window.innerHeight),
    y_speed: range(Y_SPEED_MIN, Y_SPEED_MAX),

    rot: 0,
    rot_add: range(ROT_SPEED_MIN, ROT_SPEED_MAX),
  };
}

export function gen() {
  for (let i = 0; i < FLAKE_COUNT; i++) {
    flake_list.push(gen_one());
  }
}

function update() {
  for (let i = 0; i < FLAKE_COUNT; ++i) {
    let flake = flake_list[i];
    flake.wiggle_offset += flake.wiggle_speed;
    if (flake.wiggle_offset > 2 * Math.PI) {
      flake.wiggle_offset -= 2 * Math.PI;
    }

    flake.y += flake.y_speed;
    if (flake.y - flake.size_a > window.innerHeight) {
      flake = gen_one();
      flake_list[i] = flake;
      flake.y = -flake.size_a;
    }

    flake.rot += flake.rot_add;
    if (flake.rot > 2 * Math.PI) {
      flake.rot -= 2 * Math.PI;
    }
  }
}

function draw_flakes() {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let i = 0; i < FLAKE_COUNT; ++i) {
    let flake = flake_list[i];

    draw.star(
      ctx,
      flake.x + Math.sin(flake.wiggle_offset) * flake.wiggle,
      flake.y,
      flake.size_a,
      '#818080',
      flake.width_a,
      flake.rot,
      Math.PI / 3
    );
    draw.star(
      ctx,
      flake.x + Math.sin(flake.wiggle_offset) * flake.wiggle,
      flake.y,
      flake.size_b,
      '#f4f3f2',
      flake.width_b,
      flake.rot + Math.PI / 6,
      Math.PI / 3
    );
  }
}
