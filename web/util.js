// Utilities

'use strict';

// Should not import from local modules here.

// Exported

export function acceleration_curve(speed_float, adj_map) {
  let s_sign = Math.sign(speed_float);
  let s_abs = Math.abs(speed_float);
  let s_clamp = Math.max(0.01, Math.min(s_abs, 1000));
  let s_exp = Math.exp(s_clamp * adj_map.a);
  let s_final = (s_exp - 1) * s_sign;
  return (s_exp * adj_map.b - 1) * s_sign;
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
  ev.stopImmediatePropagation();
  ev.stopPropagation();
  if (ev.cancelable) {
    ev.preventDefault();
  }
  // Returning false from an on() jQuery event handler calls event.stopPropagation() and
  // event.preventDefault().
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

  return function (ev) {
    // $('#right').text(freq.get_hz());

    if (!is_blocked) {
      is_blocked = true;
      setTimeout(function () {
        is_blocked = false;
      }, delay_ms);

      fn(ev);

      // freq.count_event();
    }
  };
}

class FrequencyCounter {
  // jshint ignore:line
  constructor() {
    this.start_ts = Date.now();
    this.event_count = 0;
  }

  reset() {
    this.start_ts = Date.now();
    this.event_count = 0;
  }

  count_event() {
    this.event_count += 1;
  }

  get_hz() {
    let elapsed_sec = (Date.now() - this.start_ts) / 1000;
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
    if (this.buf[i]) {
      this.idx = i;
      return this.buf[this.idx];
    }
  }

  next() {
    if (this.buf[this.idx]) {
      this.idx = (this.idx + 1) & this.mask;
      return this.buf[this.idx];
    }
  }
}

export function calc_distance(x, y) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}
