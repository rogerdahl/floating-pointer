// Mouse movement

'use strict';

import * as settings from "./settings.js";
import * as touch from "./touch.js";
import * as ws from "./ws.js";
import * as scroll from "./scroll.js";
import * as util from "./util.js";
import * as log from "./log.js";

// Exported

export function register_event_handlers()
{
  log.info('move.register_event_handlers()');
  $('#move')
      .on('mousedown touchstart', (ev) => {
        handle_move_start(ev);
        return util.stop(ev);
      })
      .on('mousemove touchmove', (ev) => {
        // Ignore mousemove (hover) events unless mouse button is down.
        if (!touch.is_active(ev)) {
          return; // true;
        }
        handle_touch_move(ev);
        // util.limit_event_rate(handle_touch_move(ev), 0.3);
        return util.stop(ev);
      })
  ;
}

// Local

function handle_move_start(ev)
{
  log.debug(ev, 'handle_move_start()');
  // Start coordinates for this touch have been captured by the touch tracker.

  scroll.stop_all(ev);

  // if (smooth_toggle) {
  //     start_middle_press();
  // } else {
  //     start_interval_timer(ev);
  // }
  // scroll.active = true;
  // // scroll.auto_active = false;
  // // adjust_scroll_speed(ev);
  // sync_indicator(ev, 0);
}

function handle_touch_move(ev)
{
  log.debug(ev, 'handle_touch_move()');
  const d = touch.get_delta(ev, 'move');
  ws.send('touch',
      Math.round(d.x * settings.TOUCH_MOVE_SENSITIVITY),
      Math.round(d.y * settings.TOUCH_MOVE_SENSITIVITY)
      // acceleration_curve(dx, TOUCH_SENSITIVITY),
      // acceleration_curve(dy, TOUCH_SENSITIVITY),
  );
}
