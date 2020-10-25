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
let g_touch_pos;
let g_socket;
let g_touch_start_ts;

let g_button_dict = {};
['left', 'middle', 'right'].forEach(name =>
    g_button_dict[name] = {
      name: name,
      hold: false,
      toggle: false,
      hold_timer: undefined
    }
);


$(function () {
  register_global_error_handler();
  register_on_any();
  create_socket();

  // Show touch events received by an element.
  $('#left,#middle,#right,#scroll,#touch').onAny(function (e) {
    if (!e.type.includes('touch')) {
      return;
    }
    // Suppress frequent events that may push out more useful information.
    if (e.type.includes('move') || e.type.includes('rawupdate')) {
      return;
    }
    dbg(e.type);
  });

  $('#left,#middle,#right')
      .on('mousedown touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_button_touch_start(ev.currentTarget.id);
        // TODO: Move to the virtualized mouse events in jQuery Mobile. That way, we'll need
        // just one event type in 'on', and can skip 'stopImmediatePropagation' (which causes
        // just one of the handlers in 'on' to be called.)
        ev.stopImmediatePropagation();
        // Returning false, calls event.stopPropagation() and event.preventDefault().
        return false;
      })
      .on('mouseup touchend mouseout', (ev) => {
        handle_button_touch_end(ev.currentTarget.id);
        ev.stopImmediatePropagation();
        return false;
      });

  $('#touch')
      // Fore more control, we don't capture click events. Instead, we monitor the length of touch
      // events and infer clicks.
      .on('mouseenter touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_touch_start(ev);
        ev.stopImmediatePropagation();
        return false;
      })
      .on('mouseup mouseout touchend', (ev) => {
        handle_touch_end();
        ev.stopImmediatePropagation();
        return false;
      })
      .on('mousemove touchmove', (ev) => {
        handle_touch_move(ev);
        ev.stopImmediatePropagation();
        return false;
      });

  $('#scroll')
      // As with events in #touch, we don't capture click events here.
      .on('mousedown touchstart', (ev) => {
        stop_auto_scroll(ev);
        handle_scroll_touch_start(ev);
        ev.stopImmediatePropagation();
        return false;
      })
      .on('mouseup mouseout touchend', (ev) => {
        handle_scroll_touch_end(ev);
        ev.stopImmediatePropagation();
        return false;
      })
      .on('mousemove touchmove', (ev) => {
        handle_scroll_move(ev);
        ev.stopImmediatePropagation();
        return false;

        //   let pos = get_xy(ev);
        //   let elementMouseIsOver = document.elementFromPoint(pos.x, pos.y);
        //   $('#right').text(elementMouseIsOver.id);
        //   if (elementMouseIsOver.id !== 'scroll') {
        //     $(this).trigger('touchend');
        //   }
        //   // if($("#scroll:hover").length === 0) {
        //   //   ++TEST_COUNTER;
        //   //   $('#right').text(TEST_COUNTER.toString());
        //   // }
        //   //     $(".hint").text("Mouse is Over the DIV Element.");
        //   // } else{
        //   //     $(".hint").text("Mouse is Outside the DIV Element.");
        //   // }
        //
        //   handle_scroll_move(ev);
        //   ev.stopImmediatePropagation();
        //   return false;
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
  let d = g_button_dict[name];
  d.hold = true;
  d.hold_timer = setTimeout(handle_button_hold, TAP_HOLD_THRESHOLD_MSEC, d);
  sync_button_classes(d);
}

function handle_button_touch_end(name) {
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
  $(`#${d.name}`)
      .toggleClass('button-touch', d.hold)
      .toggleClass('highlight', d.toggle)
  ;
}

// Touch, move

function handle_touch_start(ev) {
  g_touch_pos = get_xy(ev);
  g_touch_start_ts = Date.now();
}

function handle_touch_move(ev) {
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
  if (Date.now() - g_touch_start_ts < TOUCH_CLICK_THRESHOLD_MSEC) {
    if (TOUCH_LEFT_CLICK) {
      handle_button_click(g_button_dict['left']);
    } else {
      dbg('ignored click (see settings)')
    }
  }
}

// Scroll
//
// See the README.md for info on the type of scrolling implemented here.

function handle_scroll_touch_start(ev) {
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
  let y = get_y(ev);
  let dy = scroll.start_y - y;
  scroll.direction = -Math.sign(dy);
  scroll.speed_hz = acceleration_curve(dy, SCROLL_SENSITIVITY);
  if (DISPLAY_FREQUENCY) {
    display_frequency(ev, y, dy);
  }
}

function display_frequency(ev, y, dy) {
  const scroll_left = $('#scroll').offset().left;
  let tip_el = $('#scroll-tip');
  tip_el
      .text(
          `${dy > 0 ? '\u25b2' : '\u25bc'} ` +
          `${scroll.speed_hz.toFixed(2)} Hz`
      )
      .css('top', `${y - tip_el.outerHeight()}px`)
      .css('left', `${scroll_left - tip_el.outerWidth()}px`);

  tip_el.toggleClass('highlight', is_auto_scroll_available(ev));
}

function is_auto_scroll_available(ev) {
  return (
      SCROLL_AUTO_THRESHOLD_LOW_HZ < scroll.speed_hz &&
      SCROLL_AUTO_THRESHOLD_HIGH_HZ >= scroll.speed_hz &&
      is_currently_touched_element(ev)
  );
}

function handle_scroll_touch_end(ev) {
  if (is_auto_scroll_available(ev)) {
    dbg('-> auto-scroll start');
  } else {
    stop_scroll();
  }
}

function stop_auto_scroll(_ev) {
  if (scroll.interval_handle) {
    dbg('-> auto-scroll stop');
    stop_scroll();
  }
}

function stop_scroll() {
  $('#scroll-tip').removeClass('moving');
  clearInterval(scroll.interval_handle);
  scroll.interval_handle = undefined;
}

function handle_scroll_interval(_ev) {
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
  if (ev.type.startsWith('touch')) {
    const evt = (typeof ev.originalEvent === 'undefined') ? ev : ev.originalEvent;
    const touch = evt.touches[0] || evt.changedTouches[0];
    return {x: touch.pageX, y: touch.pageY};
  } else {
    return {x: ev.clientX, y: ev.clientY};
  }
}

// Return `true` if the element that is currently receiving touch events is also the element under
// the point being touched.
//
// Touch events are bound to the element where the event first started. The element does not receive
// any events that indicate that the touch has left the event boundaries, like pointerout,
// pointerup, lostpointercapture and pointerleave. In general, that's beneficial. For instance, it
// allows the user to adjust a slider without having to stay inside the slider throughout the entire
// adjustment.
function is_currently_touched_element(ev) {
  let pos = get_xy(ev);
  let touched_el = document.elementFromPoint(pos.x, pos.y);
  return ev.currentTarget === touched_el;
}

function status(status_str) {
  $('#status').text(status_str);
}


let g_line_arr = Array();
let g_last_op_str = '';
let g_count_int = 0;


function dbg(...debug_str_list) {
  let debug_str = debug_str_list.join(' ');

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

function register_global_error_handler() {
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

// Event handler for all events that are received by an element. Used like "on", except
// that it does not take a list of events.
function register_on_any() {
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
