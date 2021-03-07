// Mouse move

'use strict';

import * as buttons from './buttons.js';
import * as move from './move.js';
import * as scroll from './scroll.js';
import * as touch from './touch.js';
import * as ws from './ws.js';
import * as log from './log.js';

$(document).ready((_ev) => {
  // alert('ready');
  log.register_global_error_handler();
  ws.connect();
  touch.register_start_handler();
  buttons.register_event_handlers();
  move.register_event_handlers();
  scroll.register_event_handlers();
  touch.register_end_handler();

  $('#full-screen').on('click', () => {
    // throw Error('TEST ERROR HANDLER');
    const grid_el = $('#full')[0];
    if (!document.fullscreenElement) {
      grid_el.requestFullscreen().catch((err) => {
        alert(`Unable to enter full screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        alert(`Unable to exit full screen: ${err.message} (${err.name})`);
      });
    }
  });

  // Workaround for browsers that don't subtract the OS menu bar height from the vertical
  // size used for 100vh.
  // https://github.com/Hiswe/vh-check
  let view_height = null;
  $('#full').on('fullscreenchange', (ev) => {
    const grid_el = $('#full')[0];
    const full_el = $('#full-screen');
    full_el.toggleClass('highlight', document.fullscreenElement);
    if (document.fullscreenElement) {
      log.debug(
        ev,
        `Element: ${document.fullscreenElement.id} entered full-screen mode`
      );
      view_height = grid_el.style.getPropertyValue('--vh-offset');
      grid_el.style.setProperty('--vh-offset', window.test.value);
    } else {
      console.log('Leaving full-screen mode');
      grid_el.style.setProperty('--vh-offset', view_height);
    }
  });
});
