// Utilities

'use strict';

// import * as settings from "./settings.js";
// import * as ws from "./ws.js";

// Should not import from local modules here.

// Exported

export function acceleration_curve(speed_float, adj_map)
{
  let s_sign = Math.sign(speed_float);
  let s_abs = Math.abs(speed_float);
  let s_clamp = Math.max(0.01, Math.min(s_abs, 1000));
  let s_exp = Math.exp(s_clamp * adj_map.a);
  let s_final = (s_exp - 1) * s_sign;
  return ((s_exp * adj_map.b) - 1) * s_sign;
}


export function sleep(ms)
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Register the 'onAny()' function. Works like 'on()', except that it does not take a list of
// events and instead captures all events.
export function register_on_any()
{
  $.fn.onAny = function (cb) {
    for (const k in this[0]) { // noinspection JSUnfilteredForInLoop
      if (!k.search('on')) { // noinspection JSUnfilteredForInLoop
        this.on(k.slice(2), function (e) {
          cb.apply(this, [e]);
        });
      }
    }
    return this;
  };
}

// https://stackoverflow.com/a/32538867/442006
export function is_iterable(obj)
{
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}


// Get all properties belonging to, or inherited by the object.
export function get_properties(obj)
{
  let property_set = new Set();
  // Walk up the chain of prototypes.
  do {
    let keys = Reflect.ownKeys(obj)
    keys.forEach((k) => {
      property_set.add(k);
    });
  }
  while (obj = Reflect.getPrototypeOf(obj));
  return property_set;
}

// Get all properties belonging to, NOT inherited by the object.
export function get_direct_properties(obj)
{
  let property_set = new Set();
  let keys = Reflect.ownKeys(obj)
  keys.forEach((k) => property_set.add(k));
  return property_set;
}

export function stop(ev)
{
  ev.stopImmediatePropagation();
  // ev.preventDefault();
  // ev.stopPropagation()
  // Returning false from an on() jQuery event handler calls event.stopPropagation() and event.preventDefault().
  return false;
}


// Wrap an event handler and limit the rate at which it gets called.
//
// If the last call we received was blocked, we perform the call and immediately block again. The question is if we want
// to be pessimistic or optimistic. Pessimistic would be to assume that we won't soon get an updated event, while
// optimistic would be to assume that we will soon get a new event. If we're pessimistic, we might as well run the
// blocked one, even though that causes us to have to block again and so we miss out on a new event if we instead should
// have been optimistic.

export function _limit_event_rate(fn, ev, limit_hz)
{
  let wrapped_fn = fn;
  let last_event = null
  let is_blocked = false;

  // The wrapper that is called without rate limiting.
  return function (ev) {
    last_event = ev;

    if (!is_blocked) {
      run()
    }
  }

  function run()
  {
    if (last_event == null) {
      return;
    }
    wrapped_fn(ev);
    last_event = null;
    is_blocked = true;

    setTimeout(() => {
      is_blocked = false;
      run();
    }, Math.round(1 / limit_hz) * 1000);
  }
}

