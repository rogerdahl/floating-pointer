// See the README.md for how to adjust these constants.
const TAP_HOLD_THRESHOLD_MSEC = 300;

const TOUCH_STEP_MULTIPLIER = 4.0;
const TOUCH_LEFT_CLICK = true;

const SCROLL_STEP_HZ = 0.03;
const SCROLL_INTERVAL_MSEC = 10;
const DISPLAY_FREQUENCY = true;

// true: Write debug messages to console.
const DEBUG = true;

// Globals
let button_dict;
let touch_pos;
let socket;


$(function () {
  create_socket();

  button_dict = {};
  ['left', 'middle', 'right'].forEach(name =>
      button_dict[name] = {
        name: name,
        hold: false,
        toggle: false,
        hold_timer: undefined
      });

  $('#left,#middle,#right')
      .on('mousedown touchstart', (event) => {
        handle_button_start(event.currentTarget.id);
        event.preventDefault();
      })
      .on('mouseup touchend mouseout', (event) => {
        handle_button_end(event.currentTarget.id);
        event.preventDefault();
      });

  $('#touch')
      .on('click', () => {
        handle_touch_click();
      })
      .on('mouseenter touchstart', (event) => {
        handle_touch_start(event);
      })
      .on('mousemove touchmove', (event) => {
        handle_touch_move(event);
      });

  $('#scroll')
      .on('mousedown touchstart', (event) => {
        handle_scroll_start(event);
      })
      .on('mouseup mouseout touchend', () => {
        handle_scroll_end();
      })
      .on('mousemove touchmove', (event) => {
        handle_scroll_move(event);
      });

  $('#full-screen').on('click', () => {
    let viewer = $("#full")[0];
    // noinspection JSUnresolvedVariable
    let rFS = viewer.webkitRequestFullscreen || viewer.requestFullscreen;
    rFS.call(viewer).then();
  });
});


// Buttons

function handle_button_start(name) {
  let d = button_dict[name];
  d.hold = true;
  d.hold_timer = setTimeout(handle_button_hold, TAP_HOLD_THRESHOLD_MSEC, d);
  sync_button_classes(d);
}

function handle_button_end(name) {
  let d = button_dict[name];
  // There's no race here because functions can't be interrupted by events.
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
  if (d.toggle) {
    send(d.name, 'up');
    d.toggle = false;
  }
  send(d.name, 'click');
  d.hold = false;
  sync_button_classes(d);
}

function handle_button_hold(d) {
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
    $(`#${d.name}`).addClass('button-down')
  } else {
    $(`#${d.name}`).removeClass('button-down')
  }
}

// Touch, move

function handle_touch_click() {
  if (TOUCH_LEFT_CLICK) {
    handle_button_click(button_dict['left']);
  }
}

function handle_touch_start(event) {
  touch_pos = get_xy(event);
}

function handle_touch_move(event) {
  let cur_pos = get_xy(event);
  let dx = cur_pos.x - touch_pos.x;
  let dy = cur_pos.y - touch_pos.y;
  touch_pos = cur_pos;
  send(
      'touch',
      Math.round(dx * TOUCH_STEP_MULTIPLIER),
      Math.round(dy * TOUCH_STEP_MULTIPLIER)
  );
}

// Scroll
//
// See the README.md for info on the type of scrolling implemented here.

function handle_scroll_start(event) {
  scroll.start_y = get_y(event);
  scroll.elapsed_sec = 0.0;
  scroll.interval_handle = setInterval(
      handle_scroll_interval, SCROLL_INTERVAL_MSEC
  );
  $('#scroll-tip').addClass('moving');
  handle_scroll_move(event);
}

function handle_scroll_move(event) {
  let y = get_y(event);
  let dy = scroll.start_y - y;
  scroll.direction = -Math.sign(dy);
  scroll.speed_hz = Math.abs(SCROLL_STEP_HZ * dy);
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
}

function handle_scroll_end() {
  $('#scroll-tip').removeClass('moving');
  clearInterval(scroll.interval_handle);
}

function handle_scroll_interval() {
  scroll.elapsed_sec += SCROLL_INTERVAL_MSEC / 1000;
  if (scroll.elapsed_sec >= (1.0 / scroll.speed_hz)) {
    send('scroll', scroll.direction);
    scroll.elapsed_sec = 0.0;
  }
}


// WebSocket

function create_socket() {
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.onopen = () => {
    status(`Connected to ${location.host}`);
  };
  socket.onmessage = (event) => {
    status(`Message from server: ${event.data}`);
    return false;
  }
  socket.onclose = () => {
    status('Disconnected. Trying to connect...');
    setTimeout(create_socket, 1000);
  }
  socket.onerror = (event) => {
    status(`WebSocket error: ${event.message}`);
  }
}

function send(...cmd_list) {
  let cmd_str = cmd_list.join(' ');
  dbg(`Sending: ${cmd_str}`);
  if (socket.readyState === 1) {
    socket.send(cmd_str);
  } else {
    dbg('Send failed. Socket not ready.')
  }
}

// Util

function get_y(event) {
  return get_xy(event).y;
}

function get_xy(event) {
  let e;
  if (event.type.startsWith('touch')) {
    e = event.touches[0];
  } else {
    e = event;
  }
  return {x: e.clientX, y: e.clientY};
}

function status(status_str) {
  $('#status').text(status_str);
}

function dbg(debug_str) {
  if (DEBUG) {
    console.log(debug_str);
  }
}
