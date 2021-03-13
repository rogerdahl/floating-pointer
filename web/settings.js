// Global settings
// See the README.md for how to adjust these settings.

'use strict';

// Sensitivity settings. Input values are multiplied with these before they're used.
// Higher values are more sensitive (less movement is required on the touchpad).
export const TOUCH_MOVE_SENSITIVITY = 2.0;
export const WHEEL_SCROLL_SENSITIVITY = 0.04;
export const SMOOTH_SCROLL_SENSITIVITY = 0.015;

// Tap / hold / swipe durations (time and radius)
export const TAP_DURATION_MS = 200;
export const TAP_RADIUS_PIXELS = 20;

// Lowest allowed spin speed. This causes the pointer to stop instead of slowly floating away. If
// you find that the pointer stops when you just want it to move slowly, increase this value.
export const SPIN_SPEED_THRESHOLD = 0.1;

// Enable Touch area to also pick up left clicks.
export const TOUCH_LEFT_CLICK = true;

// Period in milliseconds, determines the frequency at which to evaluate user input to determine if it's time
// trigger a wheel scroll event.
export const SCROLL_INTERVAL_MS = 20;

// Period in milliseconds, between each attempt to reconnect a lost WebSocket connection to the desktop.
export const WEB_SOCKET_TIMEOUT_MS = 1000;

// Max number of event messages to send over the network to the desktop machine per second.
export const MOUSE_MOVE_RATE_LIMIT_HZ = 120;
export const SCROLL_MOVE_RATE_LIMIT_HZ = 120;

// Enable drawing symbols to indicate user input and triggered actions.
export const ENABLE_MYSTERY_RUNES = true;

// Spin
// These determine which part of a swipe is considered when setting the speed and direction for a
// spin.
export const SPIN_SPEED_TOLERANCE = 0.8;
export const SPIN_ANGLE_TOLERANSE_DEG = 10;

// Logging
export const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
};

// Log level
// export const LOG_LEVEL = LogLevel.DEBUG;
export const LOG_LEVEL = LogLevel.INFO;
// export const LOG_LEVEL = LogLevel.ERROR;
