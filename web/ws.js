// WebSocket

// This module can handle any number of concurrent outgoing WebSocket connections, tracked by
// names passed in by when creating the connections. Named connections are not currently in
// use, but leaving the code in for now.

'use strict';

import * as log from './log.js';

// Exported

// export async function connect(host, port, connection_name = '') {
//     log.debug('connect()');
//     let s;
//     while (true) {
//         try {
//             s = create_socket(host, port, connection_name);
//             g_socket_map.set(connection_name, s);
//             return;
//         } catch (e) {
//             // log.error(e);
//             log.status(e);
//             await log.sleep(1000);
//         }
//     }
// }

export function connect(connection_name = '')
{
  // log.status(`Status: Connecting to ${location.host}...`);
  _get_socket(connection_name);
}

// Send a mouse emulation command to the desktop machine.
export function send(...str_list)
{
  log.cmd_sent(...str_list);
  return send_named('', str_list);
}

// Local

const g_socket_map = new Map();

function send_named(connection_name, str_list)
{
  let s = _get_socket(connection_name);
  const msg_str = str_list.join(' ');
  if (s.is_ready()) {
    s.send(msg_str);
  }
  else {
    console.error('Socket not ready');
  }
}

function _get_socket(connection_name)
{
  if (!g_socket_map.has(connection_name)) {
    const s = create_socket(location.hostname, location.port, connection_name);
    g_socket_map.set(connection_name, s);
  }
  return g_socket_map.get(connection_name);
}

function create_socket(host, port, connection_name)
{
  let s = new WebSocket(`ws://${host}:${port}/ws`);
  g_socket_map.set(connection_name, s);
  s.wait_then_create = () => {
    const k = `${connection_name}_timeout_handle`;
    if (g_socket_map.has(k)) {
      clearTimeout(g_socket_map.get(k));
      g_socket_map.delete(k);
    }
    const timeout_handle = setTimeout(create_socket, 1000, host, port, connection_name);
    g_socket_map.set(k, timeout_handle);
  };
  s.is_ready = () => {
    return s.readyState === 1;
  };
  s.onopen = () => {
    log.status(`Status: Connected to ${location.host}`);
  };
  s.onmessage = (ev) => {
    log.status(`Status: Message from host: ${ev.data}`);
  };
  s.onclose = () => {
    log.status(`Status: Attempting to reconnect to ${host}...`);
    s.wait_then_create();
  };
  s.onerror = (ev) => {
    log.status(`Status: WebSocket error: ${ev.message}`);
    s.wait_then_create();
  };
  return s;
}
