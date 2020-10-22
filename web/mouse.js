// See the README.md for how to adjust these constants.
const TAP_HOLD_THRESHOLD_MSEC = 300;

const TOUCH_STEP_MULTIPLIER = 4.0;
// const TOUCH_SENSITIVITY = [0.17, 1.0];
const TOUCH_LEFT_CLICK = true;
const TOUCH_CLICK_THRESHOLD_MSEC = 100;

// const SCROLL_STEP_HZ = 0.03;
const SCROLL_INTERVAL_MSEC = 20;
const DISPLAY_FREQUENCY = true;
const SCROLL_AUTO_THRESHOLD_HIGH_HZ = 1.5;
const SCROLL_AUTO_THRESHOLD_LOW_HZ = 0.1;
const SCROLL_SENSITIVITY = [0.01, 0.8];

// true: Write debug messages to console.
const DEBUG = true;
// true: Show debug messages in the device UI.
const UI_DEBUG = true;

// Globals
let g_button_dict;
let g_touch_pos;
let g_socket;
let g_touch_start_ts;

g_button_dict = {};
['left', 'middle', 'right'].forEach(name =>
    g_button_dict[name] = {
      name: name,
      hold: false,
      toggle: false,
      hold_timer: undefined
    }
);


$(function () {
  install_global_error_handler();
  create_socket();

  $('#left,#middle,#right')
      .on('mousedown touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_button_touch_start(ev.currentTarget.id);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
      .on('mouseup touchend mouseout', (ev) => {
        handle_button_touch_end(ev.currentTarget.id);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      });

  $('#touch')
      // The sequence of touch and mouse events that are triggered did not seem to work well for
      // this particular application, so we don't capture click events. Instead, we time the
      // duration of touch events and trigger clicks directly.
      .on('mouseenter touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_touch_start(ev);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
      .on('mouseup mouseout touchend', (ev) => {
        handle_touch_end();
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
      .on('mousemove touchmove', (ev) => {
        handle_touch_move(ev);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      });

  $('#scroll')
      // As with events in #touch, we don't capture click events here.
      .on('mousedown touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_scroll_touch_start(ev);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
      .on('mouseup mouseout touchend', (ev) => {
        handle_scroll_touch_end(ev);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
      .on('mousemove touchmove', (ev) => {
        handle_scroll_move(ev);
        ev.stopImmediatePropagation();
        ev.preventDefault();
      })
  ;

  $('#full-screen').on('click', () => {
    let viewer = $("#full")[0];
    // noinspection JSUnresolvedVariable
    let rFS = viewer.webkitRequestFullscreen || viewer.requestFullscreen;
    rFS.call(viewer).then();
  });
});

// Buttons

function handle_button_touch_start(name) {
  dbg('button_touch_start');
  let d = g_button_dict[name];
  d.hold = true;
  d.hold_timer = setTimeout(handle_button_hold, TAP_HOLD_THRESHOLD_MSEC, d);
  sync_button_classes(d);
}

function handle_button_touch_end(name) {
  dbg('button_touch_end');
  let d = g_button_dict[name];
  // There's no race here as functions can't be interrupted by events.
  clearTimeout(d.hold_timer);
  if (!d.hold) {
    // Hold has been detected and handled, so there's nothing more to do for touch end.
    return;
  }
  handle_button_click(d);
}

function handle_button_click(d) {
  // Handle short hold as a click. Click always causes toggled down button to be
  // released first.
  dbg('button_click');
  if (d.toggle) {
    send(d.name, 'up');
    d.toggle = false;
  }
  send(d.name, 'click');
  d.hold = false;
  sync_button_classes(d);
}

function handle_button_hold(d) {
  dbg('button_hold');
  d.toggle = !d.toggle;
  send(d.name, d.toggle ? 'down' : 'up');
  d.hold = false;
  sync_button_classes(d);
}

function sync_button_classes(d) {
  // Why doesn't this work?
  // (d.hold ? e.addClass : e.removeClass)('button-touch');
  if (d.hold) {
    $(`#${d.name}`).addClass('button-touch')
  } else {
    $(`#${d.name}`).removeClass('button-touch');
  }
  if (d.toggle) {
    $(`#${d.name}`).addClass('highlight')
  } else {
    $(`#${d.name}`).removeClass('highlight')
  }
}

// Touch, move

function handle_touch_start(ev) {
  dbg('touch_start');
  g_touch_pos = get_xy(ev);
  g_touch_start_ts = Date.now();
}

function handle_touch_move(ev) {
  // dbg('touch_move');
  let cur_pos = get_xy(ev);
  let dx = cur_pos.x - g_touch_pos.x;
  let dy = cur_pos.y - g_touch_pos.y;
  g_touch_pos = cur_pos;
  send(
      'touch',
      Math.round(dx * TOUCH_STEP_MULTIPLIER),
      Math.round(dy * TOUCH_STEP_MULTIPLIER)
      // acceleration_curve(dx, TOUCH_SENSITIVITY),
      // acceleration_curve(dy, TOUCH_SENSITIVITY),
  );
}

function handle_touch_end(_ev) {
  dbg('touch_end');
  if (Date.now() - g_touch_start_ts < TOUCH_CLICK_THRESHOLD_MSEC) {
    if (TOUCH_LEFT_CLICK) {
      handle_button_click(g_button_dict['left']);
    } else {
      dbg('ignored click (settings)')
    }
  }
}

// Scroll
//
// See the README.md for info on the type of scrolling implemented here.

function handle_scroll_touch_start(ev) {
  dbg('scroll_touch_start');
  console.assert(typeof scroll.interval_handle == 'undefined');
  scroll.start_y = get_y(ev);
  scroll.interval_start_ts = Date.now();
  scroll.interval_handle = setInterval(
      handle_scroll_interval, SCROLL_INTERVAL_MSEC
  );
  $('#scroll-tip').addClass('moving');
  handle_scroll_move(ev);
}

function handle_scroll_move(ev) {
  dbg('scroll_move');
  let y = get_y(ev);
  let dy = scroll.start_y - y;
  scroll.direction = -Math.sign(dy);
  scroll.speed_hz = acceleration_curve(dy, SCROLL_SENSITIVITY);
  if (DISPLAY_FREQUENCY) {
    display_frequency(y, dy);
  }
}

function display_frequency(y, dy) {
  const scroll_left = $('#scroll').offset().left;
  let tip_el = $('#scroll-tip');
  tip_el
      .text(
          `${dy > 0 ? '\u25b2' : '\u25bc'} ` +
          `${scroll.speed_hz.toFixed(2)} Hz`
      )
      .css('top', `${y - tip_el.outerHeight()}px`)
      .css('left', `${scroll_left - tip_el.outerWidth()}px`);


  if (SCROLL_AUTO_THRESHOLD_LOW_HZ < scroll.speed_hz && scroll.speed_hz <= SCROLL_AUTO_THRESHOLD_HIGH_HZ) {
    tip_el.addClass('highlight');
  } else {
    tip_el.removeClass('highlight');
  }

}

function handle_scroll_touch_end(ev) {
  dbg('scroll_touch_end');
  if (SCROLL_AUTO_THRESHOLD_LOW_HZ < scroll.speed_hz && scroll.speed_hz <= SCROLL_AUTO_THRESHOLD_HIGH_HZ) {
    dbg('-> starting autoscroll');
  } else {
    stop_auto_scroll(ev);
  }
}

function stop_auto_scroll(_ev) {
  if (scroll.interval_handle) {
    dbg('stop_auto_scroll');
    $('#scroll-tip').removeClass('moving');
    clearInterval(scroll.interval_handle);
    scroll.interval_handle = undefined;
  }
}

function handle_scroll_interval(_ev) {
  // dbg('scroll_interval');
  scroll.elapsed_sec += SCROLL_INTERVAL_MSEC / 1000;
  if ((Date.now() - scroll.interval_start_ts) / 1000 >= (1.0 / scroll.speed_hz)) {
    send('scroll', scroll.direction);
    scroll.interval_start_ts = Date.now();
    scroll.elapsed_sec = 0.0;
  }
}

// Sensitivity curve
function acceleration_curve(speed_float, adj_arr) {
  // let sign = Math.sign(speed_float);
  let s = Math.abs(speed_float);
  // return Math.round(
  return Math.exp(Math.abs(s * adj_arr[0]) * adj_arr[1]) - 1;
  // ) * sign;
}

// WebSocket

function create_socket() {
  g_socket = new WebSocket(`ws://${location.host}/ws`);
  g_socket.onopen = () => {
    status(`Connected to ${location.host}`);
  };
  g_socket.onmessage = (ev) => {
    status(`Message from server: ${ev.data}`);
    return false;
  }
  g_socket.onclose = () => {
    status('Disconnected. Trying to connect...');
    setTimeout(create_socket, 1000);
  }
  g_socket.onerror = (ev) => {
    status(`WebSocket error: ${ev.message}`);
  }
}

function send(...cmd_list) {
  let cmd_str = cmd_list.join(' ');
  dbg(`-> ${cmd_str}`);
  if (g_socket.readyState === 1) {
    g_socket.send(cmd_str);
  } else {
    dbg('Send failed. Socket not ready.')
  }
}

// Util

function get_y(ev) {
  return get_xy(ev).y;
}

function get_xy(ev) {
  let e;
  if (ev.type.startsWith('touch')) {
    e = ev.touches[0];
  } else {
    e = ev;
  }
  return {x: e.clientX, y: e.clientY};
}

function status(status_str) {
  $('#status').text(status_str);
}


let g_line_arr = Array();
let g_last_op_str = '';
let g_count_int = 0;


function dbg(debug_str) {
  if (DEBUG) {
    console.log(debug_str);
  }

  if (UI_DEBUG) {
    let norm_debug_str = debug_str.replace(/[-0-9]+/g, 'N');
    let norm_last_op_str = g_last_op_str.replace(/[-0-9]+/g, 'N');
    if (norm_debug_str === norm_last_op_str) {
      ++g_count_int;
    } else {
      let count_str = `${g_count_int > 1 ? ` (${g_count_int})` : ``}`;
      g_line_arr.push(`${g_last_op_str}${count_str}`);
      g_last_op_str = debug_str;
      g_count_int = 1;
    }

    let count_str = `${g_count_int > 1 ? ` (${g_count_int})` : ``}`;
    $('#dbg').html(g_line_arr.join('<br/>') + `<br/>${debug_str}${count_str}`);

    if (g_line_arr.length > 20) {
      g_line_arr.splice(0, 1);
    }

    // This should scroll the dbg_el div to the bottom, but it doesn't work:
    // dbg_el.scrollTop(dbg_el[0].scrollHeight - $(dbg_el[0].clientHeight)
    // Likely because of the stuff I'm doing to prevent things from, well, scrolling. So we
    // just print some fixed number of debug lines that there should be room for.
    // while (true) {
    //   dbg_el.html(line_str.join('<br/>'));
    //   let is_full = dbg_el.attr('scrollHeight') > dbg_el.attr('clientHeight');
    //   if (!is_full) {
    //     break;
    //   }
    //   line_str.splice(0, 1);
    // }
    // str_arr = Array()
    // for (let v in line)
  }
}

function install_global_error_handler() {
  window.onerror = function (
      msg,
      url,
      lineNo,
      columnNo,
      error
  ) {
    if (msg.toLowerCase().indexOf("script error") > -1) {
      alert('Script Error: See the browser console for details');
    } else {
      alert([
        'Message: ' + msg,
        'URL: ' + url,
        'Line: ' + lineNo,
        'Column: ' + columnNo,
        'Error object: ' + JSON.stringify(error)
      ].join('\n'));
    }
    return false;
  };
}
