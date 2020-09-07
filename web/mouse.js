// See the README.md for how to adjust these values.
const TOUCH_STEP_MULTIPLIER = 4.0;
const SCROLL_STEP_HZ = 0.03;
const SCROLL_INTERVAL_SEC = 0.01;
const SCROLL_LEFT_CLICK = false;

// true: Write verbose status messages
const DEBUG = false;

let TOUCH_LAST_X = 0;
let TOUCH_LAST_Y = 0;

let SCROLL_ELAPSED_SEC = 0.0;
let SCROLL_DIR = 0.0;
let SCROLL_INTERVAL_HANDLE = 0.0;
let SCROLL_SPEED_HZ = 0.0;
let SCROLL_START_Y = 0.0;

let BUTTON_LEFT_IS_DOWN = false;
let BUTTON_RIGHT_IS_DOWN = false;

let SOCKET;
let STATUS_VEC = []
// Number of status lines to display
const STATUS_LINE_COUNT = DEBUG ? 20 : 1;


$(function () {
  openSocket();

  $('#left').on('click', function () {
    sendLeftClick();
  });
  $('#left-hold').on('click', function () {
    updateHold(false, !BUTTON_LEFT_IS_DOWN);
  });
  $('#right').on('click', function () {
    sendRightClick();
  });
  $('#right-hold').on('click', function () {
    updateHold(true, !BUTTON_RIGHT_IS_DOWN);
  });
  $('#touch').on('click', function () {
    sendLeftClick();
  }).on('touchstart', function (event) {
    TOUCH_LAST_X = event.touches[0].clientX;
    TOUCH_LAST_Y = event.touches[0].clientY;
  }).on('touchend', function (event) {
  }).on('touchmove', function (event) {
    let x = event.touches[0].clientX;
    let y = event.touches[0].clientY;
    let dx = x - TOUCH_LAST_X;
    let dy = y - TOUCH_LAST_Y;
    TOUCH_LAST_X = x;
    TOUCH_LAST_Y = y;
    send(`touch ${Math.round(dx * TOUCH_STEP_MULTIPLIER)} ${Math.round(dy * TOUCH_STEP_MULTIPLIER)}`);
  });
  $('#scroll').on('click', function () {
    if (SCROLL_LEFT_CLICK) {
      sendLeftClick();
    }
  }).on('touchstart', function (event) {
    SCROLL_START_Y = event.touches[0].clientY;
    SCROLL_SPEED_HZ = 0.0001;
    SCROLL_ELAPSED_SEC = 0.0;
    SCROLL_DIR = 0;
    dbg(`Scroll start`);
    SCROLL_INTERVAL_HANDLE = setInterval(scroller, SCROLL_INTERVAL_SEC * 1000);
  }).on('touchend', function () {
    clearInterval(SCROLL_INTERVAL_HANDLE);
    dbg(`Scroll end`);
  }).on('touchmove', function (event) {
    let y = event.touches[0].clientY;
    let dy = SCROLL_START_Y - y;
    SCROLL_DIR = -Math.sign(dy);
    SCROLL_SPEED_HZ = Math.abs(SCROLL_STEP_HZ * dy);
    dbg(`Scroll Hz=${SCROLL_SPEED_HZ} dy=${dy}`);
  });
  $('#full-screen').on('click', function () {
    let viewer = $("#full")[0];
    let rFS = viewer.webkitRequestFullscreen || viewer.requestFullscreen;
    rFS.call(viewer).then();
  })
});

function openSocket() {
  let w = new WebSocket(`ws://${location.host}/ws`);
  w.onopen = function () {
    status('Connected');
  };
  w.onmessage = function (event) {
    status(`Message from server: ${event.data}`);
    return false;
  }
  w.onclose = function () {
    status('Disconnected');
    openSocket();
  }
  w.onerror = function (event) {
    status(`WebSocket error: ${event.message}`);
  }
  SOCKET = w;
}

function status(statusStr) {
  if (STATUS_VEC.length > STATUS_LINE_COUNT) {
    STATUS_VEC.shift();
  }
  STATUS_VEC.push(statusStr);
  $('#touch').html(STATUS_VEC.join('<br/>'));
}

function dbg(debugStr) {
  if (DEBUG) {
    status(debugStr);
  }
}

// Issue single step scroll commands at the rate currently set by how far the user has "dragged" in
// the scroll area.
//
// We don't want user adjustments to implicitly trigger new scroll commands. E.g., if the user
// adjusts the scroll interval upwards, we just want to adjust the time to wait until triggering the
// new scroll.
//
// This is a bit simplistic in that we just run this method at a fixed and high rate, which is the
// time resolution of possible scroll rates. At each interval we check if the time since last single
// step scroll command was issued is equal or longer than the currently selected ratio, and trigger
// a new one if so.
function scroller() {
  SCROLL_ELAPSED_SEC += SCROLL_INTERVAL_SEC;
  if (SCROLL_ELAPSED_SEC >= (1.0 / SCROLL_SPEED_HZ)) {
    send(`scroll ${SCROLL_DIR}`);
    SCROLL_ELAPSED_SEC = 0.0;
  }
}

function cancelHold() {
  updateHold(false, false);
  updateHold(true, false);
}

function updateHold(isRight, setDown) {
  let lrStr = isRight ? 'right' : 'left';
  let isCurDown = isRight ? BUTTON_RIGHT_IS_DOWN : BUTTON_LEFT_IS_DOWN;
  if (isCurDown !== setDown) {
    if (isRight) {
      BUTTON_RIGHT_IS_DOWN = setDown;
    } else {
      BUTTON_LEFT_IS_DOWN = setDown;
    }
    send(setDown ? `${lrStr}-down` : `${lrStr}-up`);
  }
  let n = `#${lrStr}-hold`
  let el = $(n);
  if (setDown) {
    el.addClass('hold-down');
  } else {
    el.removeClass('hold-down');
  }
}


function sendLeftClick() {
  cancelHold();
  send('left');
}

function sendRightClick() {
  cancelHold();
  send('right');
}

function send(cmdStr) {
  dbg(`Sending: ${cmdStr}`);
  SOCKET.send(cmdStr);
  // preventDefault isn't necessary on my browsers but keeping it in as a reminder
  // for something to try if there's any weird behavior on other browsers.
  // $(this).preventDefault();
}
