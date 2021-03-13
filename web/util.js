// Utilities

'use strict';

// export function acceleration_curve(speed_float, adj_map) {
//   let s_sign = Math.sign(speed_float);
//   let s_abs = Math.abs(speed_float);
//   let s_clamp = Math.max(0.01, Math.min(s_abs, 1000));
//   let s_exp = Math.exp(s_clamp * adj_map.a);
//   let s_final = (s_exp - 1) * s_sign;
//   return (s_exp * adj_map.b - 1) * s_sign;
// }

import * as log from './log.js';

const USE_MOUSE_EVENTS = false;

export function event_start() {
  return USE_MOUSE_EVENTS ? 'mousedown' : 'touchstart';
}

export function event_move() {
  return USE_MOUSE_EVENTS ? 'mousemove' : 'touchmove';
}

export function event_end() {
  return USE_MOUSE_EVENTS ? 'mouseup' : 'touchend';
}

// 'mousedown|touchstart|mousemove|touchmove|mouseup|touchend'

export function get_angle(A1x, A1y, A2x, A2y, B1x, B1y, B2x, B2y) {
  let dAx = A2x - A1x;
  let dAy = A2y - A1y;
  let dBx = B2x - B1x;
  let dBy = B2y - B1y;
  let angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
  if (angle < 0) {
    angle *= -1;
  }
  let degree_angle = angle * (180 / Math.PI);
  return degree_angle;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Register the 'onAny()' function. Works like 'on()', except that it does not take a list of
// events and instead captures all events.
export function register_on_any() {
  $.fn.onAny = function (cb) {
    for (const k in this[0]) {
      // noinspection JSUnfilteredForInLoop
      if (!k.search('on')) {
        // noinspection JSUnfilteredForInLoop
        this.on(k.slice(2), function (e) {
          cb.apply(this, [e]);
        });
      }
    }
    return this;
  };
}

// https://stackoverflow.com/a/32538867/442006
export function is_iterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

// Get all properties belonging to, or inherited by the object.
export function get_properties(obj) {
  let property_set = new Set();
  // Walk up the chain of prototypes.
  // noinspection AssignmentToFunctionParameterJS
  do {
    let keys = Reflect.ownKeys(obj);
    keys.forEach((k) => {
      property_set.add(k);
    });
  } while ((obj = Reflect.getPrototypeOf(obj))); // jshint ignore:line
  return property_set;
}

// Get all properties belonging directly to (not inherited by) the object.
export function get_direct_properties(obj) {
  let property_set = new Set();
  let keys = Reflect.ownKeys(obj);
  keys.forEach((k) => property_set.add(k));
  return property_set;
}

export function stop(ev) {
  // ev.stopImmediatePropagation();
  // ev.stopPropagation();
  // if (ev.cancelable) {
  //   ev.preventDefault();
  // }
  // Returning false from an on() jQuery event handler calls
  // event.stopPropagation() and event.preventDefault().
  // return false;
}

// Wrap a method and limit the number of calls that get through to it.
//
// The first implementation of this stored each `ev` and, on timeout, called the last one, then
// immediately blocked again. That caused the order of events to be mixed up. It could trigger move
// events after touchend events, etc. This one instead just unblocks at timeout, lets the next event
// through, then blocks again.
export function rate_limiter(fn, limit_hz) {
  let delay_ms = 1000 * (1 / limit_hz);
  let is_blocked = false;
  // let freq = new FrequencyCounter();

  return function (...args) {
    // $('#right').text(freq.get_hz());

    if (!is_blocked) {
      is_blocked = true;
      setTimeout(function () {
        is_blocked = false;
      }, delay_ms);

      fn(...args);

      // freq.count_event();
    }
  };
}

export function dump_obj(obj_name, obj) {
  log.debug(`${obj_name}:`);
  if (obj instanceof Map) {
    log.debug(`Map (${obj.size}):`);
    for (let [k, v] of obj.entries()) {
      log.debug('- ', {
        k: k,
        v: v,
      });
    }
  }
  if (is_iterable(obj)) {
    for (let prop of obj) {
      log.debug(`  ${prop}:`, obj[prop]);
    }
  } else {
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        log.debug(`  ${prop}:`, obj[prop]);
      }
    }
  }
}

export function dump_obj_properties(var_name, obj) {
  log.debug(`'${var_name}' method names:`);
  let m_list = [];
  for (const n of get_properties(obj)) {
    m_list.push([obj_to_str(n), obj_to_str(obj[n])]);
  }
  for (const n of m_list.sort()) {
    log.debug(`  - ${n[0]} = ${n[1]}`);
  }
}

export function calc_distance(x, y) {
  return Math.sqrt(x * x + y * y);
}

// export function rgb_to_hex(s) {
//   return s.match(/[0-9]+/g).reduce((a, b) => a + (b | 256).toString(16).slice(1), '0x');
// }

// export function rgb_to_hex(...rgb) {
//   let bin = (r << 16) | (g << 8) | b;
//   return map((function (h) {
//     return new Array(7 - h.length).join('0') + h;
//   })(bin.toString(16).toUpperCase());
// }

export const rgb_to_hex = (r, g, b) => {
  let bin = (r << 16) | (g << 8) | b;
  return '#' + ('0' + bin.toString(16)).slice(-6);
};

export function vector_length(x, y) {
  return Math.sqrt(x * x + y * y);
}

export function unit_vector(x, y) {
  const magnitude = vector_length(x, y);
  return {x: x / magnitude, y: y / magnitude};
}

// let unit = unitVector(3, 4);
//
// console.log("Unit vector has coordinates: ", ...unit);
// console.log("It's magnitude is: ", vectorSize(...unit)); // Always 1

export class FrequencyCounter {
  // jshint ignore:line
  constructor() {
    this.start_ts = performance.now();
    this.event_count = 0;
  }

  reset() {
    this.start_ts = performance.now();
    this.event_count = 0;
  }

  count_event() {
    this.event_count += 1;
  }

  get_hz() {
    let elapsed_sec = (performance.now() - this.start_ts) / 1000;
    return `Actual: ${(this.event_count / elapsed_sec).toFixed(2)}Hz`;
  }
}

export class RingBuffer {
  constructor(bits) {
    // Size must be a power of two. 2**10 is a size of 1024
    this.size = 2 ** bits;
    this.mask = this.size - 1;
    this.idx = 0;
    this.buf = [];
  }

  clear() {
    this.idx = 0;
    this.buf = [];
  }

  get length() {
    return this.buf.length;
  }

  get(key) {
    if (key < 0) {
      return this.buf[this.idx + key];
    } else if (key === false) {
      return this.buf[this.idx - 1];
    } else {
      return this.buf[key];
    }
  }

  push(item) {
    this.buf[this.idx] = item;
    this.idx = (this.idx + 1) & this.mask;
    return item;
  }

  prev() {
    let i = (this.idx - 1) & this.mask;
    console.assert(this.buf[i]);
    this.idx = i;
    return this.buf[this.idx];
  }

  next() {
    console.assert(this.buf[this.idx]);
    this.idx = (this.idx + 1) & this.mask;
    return this.buf[this.idx];
  }
}

export class Timer {
  constructor(msg = 'Timer', max_measurements = 1000) {
    this.msg = msg;
    this.start_time = Timer.now();
    this.time_list = [];
    this.max_measurements = max_measurements;
    this.start();
  }

  start() {
    this.start_time = Timer.now();
  }

  stop() {
    this._add_time();
  }

  elapsed() {
    return Timer.now() - this.start_time;
  }

  static now() {
    // Return a DOMHighResTimeStamp
    return performance.now();
  }

  get_avg() {
    return this.time_list.reduce((a, b) => a + b) / this.time_list.length;
  }

  // Return result

  format() {
    this.stop();
    assert(this.time_list.length > 0);
    if (this.time_list.length === 1) {
      return `${this.msg}: Elapsed: ${this.elapsed().toFixed(2)} ms`;
    } else {
      return (
        `${this.msg}: Elapsed (average of last ${this.time_list.length} measurements): ` +
        `${this.get_avg().toFixed(2)} ms`
      );
    }
  }

  alert() {
    alert(this.format());
  }

  debug() {
    log.debug(this.format());
  }

  debug_limited = rate_limiter(() => {
    this.debug();
  }, 1);

  info() {
    log.info(this.format());
  }

  info_limited = rate_limiter(() => {
    this.info();
  }, 1);

  console() {
    console.log(this.format());
    // this.console_limited((this.format()));
  }

  console_limited = rate_limiter(() => {
    this.console();
  }, 1);

  _add_time() {
    this.time_list.push(this.elapsed());
    if (this.time_list.length > this.max_measurements) {
      this.time_list.shift();
    }
  }
}

export var assert = console.assert.bind(console);

export function register_console_hooks() {
  for (const level_name in log.LOG_LEVEL_DICT) {
    if (log.LOG_LEVEL_DICT.hasOwnProperty(level_name)) {
      let level_dict = log.LOG_LEVEL_DICT[level_name];
      console[level_name] = function (...obj_list) {
        log_ui(obj_list, level_dict['class']);
        // ws.send(obj_list);
      };
    }
  }
}

const logger = (className) => {
  return new Proxy(new className(), {
    get: function (target, name, receiver) {
      if (!target.hasOwnProperty(name)) {
        if (typeof target[name] === 'function') {
          console.log('Calling Method : ', name, '|| on : ', target.constructor.name);
        }
        return new Proxy(target[name], this);
      }
      return Reflect.get(target, name, receiver);
    },
  });
};

// This also captures failed console.assert().
export function register_global_error_handler() {
  console.log('register_global_error_handler()');
  window.onerror = function (msg, url, line_no, column_no, error_obj) {
    if (msg.toLowerCase().indexOf('script error') > -1) {
      alert(
        `Error: A Cross-Origin / CORS error occurred. To prevent leaking information, the error 
          details are only available in the browser console.`
      );
    } else {
      let error_list = [
        `UNHANDLED EXCEPTION:`,
        `Message: ${msg}`,
        `URL: ${url}`,
        `Line: ${line_no}`,
        `Column: ${column_no}`,
        `Stack trace:`,
      ];
      // Sadly, the stack trace is made available only as a block of text. I'd have liked to process it a bit more
      // before display, but there isn't much we can safely assume regarding the contents. So this just splits it
      // into lines, so that it can be processed like other messages we generate.
      let frame_count = 0;
      for (let frame_line of error_obj.stack.split('\n')) {
        error_list.push(`- ${frame_line}`);
        if (++frame_count === 10) {
          break;
        }
      }
      for (const exc_line of error_list) {
        log.error(exc_line);
      }
    }
  };
}

// Add a log line to the log displayed in the UI.
//
// The initial implementation of this method triggered a browser bug in Chrome on Android that it took two days to track
// down. The bug caused Chrome to completely flake out and permanently stop handling some events until the page was
// reloaded.
//
// Part of the reason it was so hard to track down was that this method is part of the logger, and I was using logging
// to try to isolate the bug. The symptoms did not indicate anything logging related.
//
// The initial implementation, that first triggered the bug, stored log lines in a global array. When called with a new
// log line to display, the line was pushed to the back of the array. The whole array was then rendered to a block of
// HTML, and the old HTML was replaced by overwriting it with the new version. The number of lines in the array was
// restricted to a predefined max by popping the oldest line from the front of the array if the max had been reached
// after adding a new line.
//
// As the log output element is inside the area that captures touch events for mouse movement, the log lines often
// become the original targets receiving the events, which then bubble up to handlers further up in the tree. Since the
// log messages are also written while handling the events, the approach in the initial implementation destroyed the
// elements in which the events originated while processing those events.
//
// JS is event driven, so the process always starts with an event, and that event remains active while any number of
// handlers that were listening for it are triggered. Manipulating the DOM often involves replacing elements, which
// destroys the old ones, one of which will often be the original target for the event. So I don't think I was doing
// anything particularly unusual. But it caused Chrome to stop calling other event handlers that were registered further
// up in the tree.
//
// In the first attempt to fix it, I removed the global array and instead directly manipulated the child elements
// holding the log lines in the DOM. So instead of replacing all the lines by overwriting them with new HTML, a single
// new child element was added at the end of the child list. And instead of removing the oldest line from the top of the
// global array, it was removed by destroying the child at the front of the child list. The max number of lines was
// selected to ensure that lines scrolled off the screen well before they became the oldest line and were destroyed.
// Surprisingly, the approach didn't help, and symptoms were identical to those of the previous approach.
//
// I then tried a variation which worked and is the one currently implemented here. In this method, the oldest element
// is recycled and used as the newest element once the predefined max number of lines is reached. So, while the number
// of lines is below the max, this method behaves like the previous ones which triggered the bug. But after reaching the
// max, it does not start destroying lines. Instead, each new line is added by detaching the oldest line from the front
// of the child list, reattaching it at the back, and modifying it to display the text and color of the new line.
function log_ui(msg_str, msg_class = '') {
  let log_el = $('#log');
  let line_el;
  if (log_el.children().length > 30) {
    line_el = log_el.children(':first');
  } else {
    line_el = $(document.createElement('div'));
  }
  line_el.text(msg_str).removeClass().addClass(msg_class);
  // append() implicitly detaches the element first, if it's currently in the DOM.
  log_el.append(line_el);
}
