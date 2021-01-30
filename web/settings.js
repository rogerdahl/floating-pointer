// Global settings
// See the README.md for how to adjust these settings.

'use strict';

// Sensitivity settings. Input values are multiplied with these before they're used.
// Higher values are more sensitive (less movement is required on the touchpad).
export const TOUCH_MOVE_SENSITIVITY = 4.0;
export const WHEEL_SCROLL_SENSITIVITY = 0.02;
export const SMOOTH_SCROLL_SENSITIVITY = 0.3;

// Tap / hold / swipe thresholds (time and radius)
export const TAP_THRESHOLD_MS = 300;
export const TAP_RADIUS_PIXELS = 20;

// Enable Touch area to also pick up left clicks.
export const TOUCH_LEFT_CLICK = true;

// Period in ms, determines the frequency at which to evaluate user input to determine if it's time
// trigger a wheel scroll event.
export const SCROLL_INTERVAL_MS = 20;

// Period in ms, between each attempt to reconnect a lost WebSocket connection to the desktop.
export const WEB_SOCKET_TIMEOUT_MS = 1000;

// Max number of event messages to send over the network to the desktop machine per second.
export const MOUSE_MOVE_RATE_LIMIT_HZ = 30;
export const SCROLL_MOVE_RATE_LIMIT_HZ = 30;

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
