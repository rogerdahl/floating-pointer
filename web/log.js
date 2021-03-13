// Logging, tracing, object and stack dumps

'use strict';

import * as settings from './settings.js';

export const LOG_LEVEL_DICT = {
  debug: {
    level: settings.LogLevel.DEBUG,
    title: 'Debug',
    class: 'log-debug',
  },
  info: {
    level: settings.LogLevel.INFO,
    title: 'Info',
    class: 'log-info',
  },
  warning: {
    level: settings.LogLevel.WARNING,
    title: 'Warning',
    class: 'log-warning',
  },
  error: {
    level: settings.LogLevel.ERROR,
    title: 'Error',
    class: 'log-error',
  },
  critical: {
    level: settings.LogLevel.CRITICAL,
    title: 'Critical',
    class: 'log-critical',
  },
  // // Write stack trace.
  // trace: {
  //   level: settings.LogLevel.INFO,
  //   title: 'Trace',
  //   class: 'log-info',
  // },
};

export function connection_status(status_str = '') {
  $('#connection_status').text(status_str);
}

export function scroll_status(status_str = '') {
  $('#scroll_status').text(status_str);
}

export function debug(...obj_list) {
  log(obj_list, 'debug');
}

export function info(...obj_list) {
  log(obj_list, 'info');
}

export function warning(...obj_list) {
  log(obj_list, 'warning');
}

export function error(...obj_list) {
  log(obj_list, 'error');
}

export function critical(...obj_list) {
  log(obj_list, 'critical');
}

// export function trace(...obj_list) {
//   console.
//   log(obj_list, 'critical');
// }

// export function cmd_sent(...obj_list) {
//   log(obj_list, 'log-cmd', settings.LogLevel.INFO, '->', true);
// }
// export var lg = console.log.bind(console);

//
// Local
//

// Create a log line and write it one or more destinations depending on what's enabled in the
// settings. Destinations are:
// - The browser console
// - The host (where it's dumped to the shell)
// - The client UI (where it appears in the main touch input area)
function log(obj_list, level_name) {
  const level_dict = LOG_LEVEL_DICT[level_name];
  if (level_dict.level < settings.LOG_LEVEL) {
    return;
  }
  let msg_str = `${level_dict.title}: ${obj_list_to_str(obj_list).join(' • ')}`;
  console[level_name](msg_str);
}

// Object to string

// It's convenient to be able to pass arbitrary objects into the logging functions and get some
// useful information printed for them. Took this for granted in Python, but it's a major hassle in
// JS. By default, most objects render as the supremely unhelpful '[ Object object ]' when
// implicitly converted to strings. These functions helps, at least for some objects. For some sad
// reason, JSON.stringify(), which can be customized by overriding toJSON() in the object to be
// rendered, works better than toString().

function obj_list_to_str(obj_list) {
  return Object.values(obj_list).map((obj) => obj_to_name_str(obj));
}

function obj_to_name_str(obj) {
  if (typeof obj == 'undefined') {
    return '<undefined>';
  }
  if (obj == null) {
    return '<null>';
  }
  const obj_str = obj_to_str(obj);
  if (typeof obj.name == 'string') {
    return `${obj.name}:${obj_str}`;
  }
  return obj_str;
}

function obj_to_str(obj) {
  if (typeof obj == 'string') {
    return `str=${obj}`;
  }
  if (typeof obj == 'number') {
    return `number=${obj.toFixed(2)}`;
  }
  try {
    return obj.originalEvent.type;
  } catch {}
  try {
    return `json=${obj.toJSON()}`;
  } catch {}
  try {
    return `json-s=${JSON.stringify(obj)}`;
  } catch {}
  try {
    return `tostr=${obj.toString()}`;
  } catch {}
  return '<error>';
}
