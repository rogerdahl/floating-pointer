# ACME Remote Mouse

<img align="right" width="40%" src="./assets/screenshot.png">

Control the mouse pointer on a Linux desktop using the touch screen on any phone or tablet.

This runs directly in the browser, so there's no app to install on the phone or tablet.

## Usage

1. Run `remote-mouse` on your Linux desktop machine
2. Browse to `http://<your machine>:7780` from your phone or tablet
3. Enjoy!

### Buttons

- Click the left-, middle- and right mouse buttons by tapping in the `Left`, `Middle` and `Right` areas.

- The left mouse button can also be clicked by tapping in the `Touch` area.

- Keep a mouse button pressed down by touching the button area until it lights up. Release in the same way.

- Tap a pressed down button to first release it, then click it.

- Double-tap a button to double-click it.

- If a button often accidentally becomes pressed down, see the configuration section for how to increase the time required for a touch to be detected as a button press instead of a click.

### Pointer

- To move the mouse pointer, swipe in the `Touch` area.

- Tapping anywhere in the `Touch` area performs a left button click, so you can click after moving the pointer without moving over to the `Left` button area.

- The sensitivity is configurable.

### Scrolling

- To scroll, position the mouse pointer on what you want to scroll, then touch the `Scroll` area and drag up or down. 

  When scrolling is active, an indicator is displayed, showing scroll direction and scroll events per second.

  Notice that movement is only required when you want to change the speed or direction. This is different from most mice, which require you to keep scrolling the mouse wheel, and most touch pads, which require you to repeatedly swipe, in order to keep scrolling.

- The sensitivity of the `Scroll` area can be configured independently from the `Touch` area.

### Automatic scrolling

This function allows you to keep scrolling without having to keep the touch active. It's mainly useful when slowly scrolling down in long web pages or documents.

- Release the `Scroll` area while the scroll frequency indicator is highlighted to start automatic scrolling.

- Stop scrolling with a tap or by starting a new action.   The scroll also stops if you close the web app or if the connection to the desktop computer is lost.

- To reduce the chance of automatic scrolling getting triggered accidentally, it is enabled only for slow scroll speeds and only while the touch remains inside the `Scroll` area.

- The range of scroll speeds for which automatic scrolling is enabled is configurable and the function can be disabled altogether (but try it out for a while first!).

### Tips

- Touches in the `Touch` and `Scroll` areas only have to start in the areas. They still register if the touch moves into another area.

- Using a drag operation to select text is cumbersome without a real mouse. Fortunately, even if there is no visible caret, there may be an invisible one. So text can be selected as if there is a caret. For instance, by clicking at one end of the selection, then holding shift while clicking at the other end, or by using the arrow keys.

  Web browsers often have an invisible caret. Chrome and Firefox also have a mode where the caret is visible.
   
  In some windows, such as error dialog boxes, you can also try to copy the text without selecting it first, by just clicking in the window and pressing Ctrl+C. 

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

You need Rust for building this. Rust usually installs with a single command, as described at:

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

The scroller generates a series of up or down scroll events at a frequency selected by the user. The events correspond to the notches that one usually feels when turning a real scroll wheel.

Checking which frequency to scroll at only once per event can be done with a simple loop that reads the frequency, waits for the amount of time required for that frequency, then sends the events and repeats. But users often scroll at only one or two events per second, and checking the user's selection so rarely would probably cause the response to feel sluggish. So this implementation uses a different approach, where the user's selection is checked at a constant rate (60 Hz by default). At each check, the time interval required for meeting the currently selected frequency is compared with the actual time since the last event was generated, and a new event is generated if the actual time is longer.

