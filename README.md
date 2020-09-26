# ACME Remote Mouse

Control the mouse pointer on a Linux desktop using the touch screen on any phone or tablet.

This runs directly in the browser, so there's no app to install on the phone or tablet.

## Usage

1. Run `remote-mouse` on your Linux desktop machine
2. Browse to `http://<your machine>:7780` from your phone or tablet
3. Enjoy!

### Buttons

- Click the left-, middle- and right mouse buttons by tapping in the `Left`, `Middle` and `Right` button areas.

- Keep a mouse button pressed down by touching the button area until it lights up. Release the button in the same way. Tap a pressed button to first release it, then click it.

- If a button is often accidentally toggled instead of clicked, increase the toggle threshold as described in the configuration section.

- Double tap a button to double-click it.


### Scrolling 

- The `Scroll` area works like the scroll wheel on a mouse. It works differently from the way scrolling works on most touch pads, which requires repeatedly swiping or dragging in order to keep scrolling. Instead, the `Scroll` area works much the same as autoscroll in web browsers. Scrolling remains active as long as the `Scroll` area is touched. The initial touch point becomes the reference point at which no scrolling occurs. Moving the touch up or down from there selects scroll direction and adjusts the scroll speed.

### Movement

- Move the mouse pointer by swiping in the desired direction in the `Touch` area. See the configuration section if the sensitivity (ratio of touch movement to mouse movement) is too low or high.

- The `Touch` area also acts as a large duplicate of the `Left` mouse button area, allowing left mouse button access without having to move when already using the `Touch` area. This function can be disabled if it causes accidental left mouse button clicks. 

### Tips

- Touches in the `Touch` and `Scroll` areas only have to start in the areas. They still register if the touch moves into another area.

- It's almost always possible to select text using clicks instead of drag operations. Drag operations are cumbersome on a tablet (you have to use the Hold function). Instead, click at the start of the text to select, then hold Shift and click at the end. It usually works even if there's no visible cursor. 

- Enter full screen mode by tapping the `Full` button. This issues a request for full screen to the browser. The request may be ignored, in which case the button will not cause any change. If full screen mode is activated, a swipe from the top or bottom of the screen will normally exit back to regular mode.

## Configuration

Sensitivity and related settings can be modified by changing the `const` values at the top of the file at `web/mouse.js`.

- `TAP_HOLD_THRESHOLD_MSEC`: The number of milliseconds that a touch in the `Left`, `Middle` or `Right` mouse button areas must last in order to turn from a regular mouse button click to a mouse button toggle.

- `TOUCH_STEP_MULTIPLIER`: Adjustment factor controlling the ratio of touch movement to mouse pointer movement. Lower values reduces the sensitivity, causing larger touch movements to be required in order to move the mouse pointer.

- `TOUCH_LEFT_CLICK` and `SCROLL_LEFT_CLICK`: Set to `true` to allow taps in the `Touch` and `Scroll` areas to trigger left-clicks. When set to `false`, taps are ignored. By default, set to `true` for the touch area and `false` for the scroll area.

- `SCROLL_STEP_HZ`: Adjustment factor, controlling the ratio of movement in the `Scroll` area to change in the scroll speed.

- `SCROLL_INTERVAL_MSEC`: Number of microseconds between each time the scroll speed is updated to reflect the user's current touch position in the `Scroll` area.

- `DISPLAY_FREQUENCY`: `true` or `false`:  Enable or disable tooltip that displays the selected scroll frequency next to the current touch point when scrolling using the `Scroll` areas. 

## Host security considerations

Anyone that can connect to the WebSocket that remote-mouse opens on the desktop PC can control the mouse. It's remotely conceivable that this could be used in an attack where the attacker guesses what's on the monitor (to determine where to click), or can see the monitor through a window, or just clicks randomly to break things. If this is of concern, access to the port should be restricted, for instance with firewall rules, or by setting remote-mouse to listen only on a localhost port, and accessing it via an SSH tunnel.

## Installation

### Build on Linux

You need Rust for building this. It usually installs with a single command, as described at:

https://www.rust-lang.org/tools/install

Then:

```shell
$ sudo apt install libxdo-dev
$ bash -c '
  git clone https://github.com/rogerdahl/remote-mouse
  cd remote-mouses
  cargo run --release
'
```
   
## Permissions

This program injects mouse events by writing to `/dev/uinput`. On most systems, only root can write to this device by default. To add write permissions to your user account:

```shell
bash -c '
    sudo groupadd --system uinput-users
    sudo usermod -a -G uinput-users $USER
    sudo cat<<END>>/etc/udev/rules.d/90-uinput.rules
KERNEL=="uinput", GROUP="uinput-users", MODE="0660"
KERNEL=="uhid", GROUP="uinput-users", MODE="0660"
END
'
```

Reboot to activate.

## Technologies

- `Rust`, `tokio`, `warp`, `enigo`.

## Implementation

### Scrolling

The most basic implementation of the type of scrolling implemented in the `Scroll` area would be to just read the frequency selected by the user, wait for the period that gives that frequency, trigger a single up or down scroll event, then repeat. But the control would be likely to feel laggy, especially at low frequencies, because adjustments done during the current cycle are only applied to the next cycle. Instead, we continuously track the user's frequency selection, and apply it during the current cycle. So, if the user is increasing the frequency, the current cycle ends earlier than it looked like it would when the cycle started. If the user is decreasing the frequency, the scroll event is delayed, occurring later than it would have if the user had not adjusted the frequency.

While the basic implementation can be be done by setting up a interval timer and adjusting it at the start of each cycle, an implementation that continuously adjusts to the user's frequency selection has to read the setting and update the timer every time it changes (ideally), or so often that it appears to be instant. This implementation uses the second approach, checking the settings every 20ms (by default) while scrolling is active.
