// Logging, tracing, object and stack dumps


'use strict';

import * as settings from "./settings.js";
import * as util from "./util.js";
import * as ws from "./ws.js";


export function status(status_str)
{
  $('#status').text(status_str);
}

export function debug(...obj_list)
{
  return log(obj_list, 'log-debug', settings.LogLevel.DEBUG);
}

export function info(...obj_list)
{
  return log(obj_list, 'log-info', settings.LogLevel.INFO);
}

export function warning(...obj_list)
{
  return log(obj_list, 'log-warning', settings.LogLevel.WARNING);
}

export function error(...obj_list)
{
  // alert(obj_list_to_str(obj_list));
  return log(obj_list, 'log-error', settings.LogLevel.ERROR);
}

export function critical(...obj_list)
{
  return log(obj_list, 'log-critical', settings.LogLevel.CRITICAL);
}

export function cmd_sent(...obj_list)
{
  return log(obj_list, 'log-cmd', settings.LogLevel.DEBUG, '->');
}


export function dump_obj(obj_name, obj)
{
  debug(`${obj_name}:`)
  if (obj instanceof Map) {
    debug(`Map (${obj.size}):`);
    for (let [k, v] of obj.entries()) {
      debug('- ', {k: k, v: v});
    }
  }
  if (util.is_iterable(obj)) {
    for (let prop of obj) {
      debug(`  ${prop}:`, obj[prop])
    }
  }
  else {
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        debug(`  ${prop}:`, obj[prop])
      }
    }
  }
}

export function dump_obj_properties(var_name, obj)
{
  debug(`'${var_name}' method names:`)
  let m_list = [];
  for (const n of util.get_properties(obj)) {
    m_list.push([_str(n), _str(obj[n])]);
  }
  for (const n of m_list.sort()) {
    debug(`  - ${n[0]} = ${n[1]}`);
  }
}

export function limit_event_rate(fn, ev, limit_hz)
{
  info('11111111111111111');
  return (ev) => {
    return fn(ev);
  }
}

// This also captures failed console.assert().
export function register_global_error_handler()
{
  console.log('register_global_error_handler()');
  window.onerror = function (
      msg,
      url,
      line_no,
      column_no,
      error_obj
  ) {
    console.error('START global_error_handler()');
    error('START global_error_handler()');

    if (msg.toLowerCase().indexOf("script error") > -1) {
      alert(
          `Error: A Cross-Origin / CORS error occurred. To prevent leaking information, the error details are 
                only available in the browser console.`
      );
    }
    else {
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
      let frame_count = 0
      for (let frame_line of error_obj.stack.split('\n')) {
        error_list.push(`- ${frame_line}`);
        if (++frame_count === 10) {
          break;
        }
      }
      for (const exc_line of error_list) {
        error(exc_line);
      }
    }
  };
}


// Create a log line and write it one or more destinations depending on what's enabled in the settings. Destinations
// are:
// - The browser console
// - The host (where it's dumped to the shell)
// - The client UI (where it appears in the main touch input area)
function log(obj_list, msg_class, log_level, prefix_str = null)
{
  if (log_level < settings.LOG_LEVEL) {
    return;
  }
  let msg_str = (
      `${prefix_str ? prefix_str : `${LOG_LEVEL_TO_NAME.get(log_level)}:`} ` +
      `${obj_list_to_str(obj_list)}`
  );
  ws.send(`# ${msg_str}`);
  console.log(msg_str);
  log_ui(msg_str, msg_class);
}

// Local

const LOG_LEVEL_TO_NAME = new Map([
  [10, 'Debug'],
  [20, 'Info'],
  [30, 'Warning'],
  [40, 'Error'],
  [50, 'Critical'],
]);


function obj_list_to_str(obj_list)
{
  return Object.values(obj_list).map((obj) => _name_str(obj));
}


function _name_str(obj)
{
  if (typeof obj == 'undefined') {
    return '<undefined>'
  }
  if (typeof obj.name != 'undefined') {
    return `${obj.name}:${_str(obj)}`;
  }
  return _str(obj);
}

// It's convenient to be able to pass arbitrary objects into the logging functions and get some useful information
// printed for them. By default, most objects render as the supremely unhelpful '[ Object object ]' when implicitly
// converted to strings. This function helps, at least for some objects. For some sad reason, JSON.stringify(), which
// can be customized by overriding toJSON() in the object to be rendered, works better than toString().
function _str(obj)
{
  if (typeof obj == 'string') {
    return obj;
  }
  try {
    return obj.originalEvent.type;
  }
  catch (exception) {
  }
  try {
    return obj.toJSON();
  }
  catch (exception) {
  }
  try {
    return JSON.stringify(obj)
  }
  catch (exception) {
  }
  try {
    return obj.toString();
  }
  catch (exception) {
  }
  return '<ERROR>'
}

// https://stackoverflow.com/a/55603620/442006
export function hook_console()
{
  if (console.everything == null) {
    console.everything = [];
    console.defaultLog = console.log.bind(console);
    console.log = function () {
      console.everything.push({
        "type": "log",
        "datetime": Date().toLocaleString(),
        "value": Array.from(arguments)
      });
      console.defaultLog.apply(console, arguments);
    }
    console.defaultError = console.error.bind(console);
    console.error = function () {
      console.everything.push({
        "type": "error",
        "datetime": Date().toLocaleString(),
        "value": Array.from(arguments)
      });
      console.defaultError.apply(console, arguments);
    }
    console.defaultWarn = console.warn.bind(console);
    console.warn = function () {
      console.everything.push({
        "type": "warn",
        "datetime": Date().toLocaleString(),
        "value": Array.from(arguments)
      });
      console.defaultWarn.apply(console, arguments);
    }
    console.defaultDebug = console.debug.bind(console);
    console.debug = function () {
      console.everything.push({
        "type": "debug",
        "datetime": Date().toLocaleString(),
        "value": Array.from(arguments)
      });
      console.defaultDebug.apply(console, arguments);
    }
  }
}


export var assert = console.assert.bind(console);
export var lg = console.log.bind(console);

// export function assert(pred_obj, msg_str) {
//     if (!pred_obj) {
//         let error_list = [
//             `ASSERT FAILED: `,
//             `${msg_str}`,
//         ];
//
//         console.error(error_list.join('\n'));
//         for (const exc_line of error_list) {
//             dbg_ui(exc_line, 'log-error');
//         }
//     }
// }

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

function log_ui(msg_str, msg_class = '')
{
  let log_el = $('#log');
  let line_el;
  if (log_el.children().length > 30) {
    line_el = log_el.children(':first');
  }
  else {
    line_el = $(document.createElement('div'));
  }
  line_el.text(msg_str).removeClass().addClass(msg_class);
  // append() implicitly detaches the element first, if it's currently in the DOM.
  log_el.append(line_el);
}
