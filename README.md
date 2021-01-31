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

- Keep a mouse button pressed by touching the button area until it lights up. Release in the same way.

- Tap a pressed button to first release it, then click it.

- Double-tap a button to double-click it.

- The threshold that separates a button tap from a press is configurable.


### Pointer

- To move the mouse pointer, swipe in the `Touch` area.

- Tapping anywhere in the `Touch` area performs a left button click.

- The pointer sensitivity is configurable.

### Mouse wheel scrolling

- To scroll, drag up or down in the`Scroll` area (and remember to hover the mouse pointer over the are to scroll).

 - Notice that movement is only required when you want to change the speed or direction. This is different from most mice and touchpads, which require some sort of continuous movement in order to keep scrolling.

 - The sensitivity of the `Scroll` area can be configured independently from the `Touch` area.

### Browser smooth scrolling

- Mouse wheel scrolling moves in small jumps, which is not ideal for those hours of doomscrolling bliss, so this app has a mode that triggers smooth scrolling in the browser.

  This function depends on functionality that is built into Firefox but requires a plugin in Chrome.
  
  To tell if it will work in your browser, try to drag in a web page while holding the middle mouse button (while physically at your desktop). This app just emulates that simple action.
  
  To use this function with Firefox, enable both `Use autoscrolling` and `Use smooth scrolling` in the Firefox settings (they're under `Browsing`, near the end of the `General` section). Then tap the `Smooth` button in the lower right in the app UI.
  
  Using this with Chrome is left as an exercise for the reader.
  
### Auto scrolling

- So we can now scroll smoothly through infinite feeds, but in our Quest for the Ultimate Doomscrolling Experience, having to keep a finger on the screen will get old quickly. So this app has mode where the mouse wheel scroll and browser smooth scroll modes (described above) can be toggled on.

- To activate this mode, start one of the previous scroll modes, dial in the speed you want, then release and tap the scroll bar.

- Auto scrolling can be started with a tap at any time and will use the previous manual speed, as long as the app hasn't been restarted in-between. In that case, auto scroll starts at the not-very-useful speed of zero point zero.
  
- Tap anywhere to stop auto scrolling. The scroll also stops if you close the web app or if the connection to the desktop computer is lost.

- If your computer seems to have a mind of its own and keeps scrolling things around the day after you used this function, your are advised to check to see if you forgot to turn the scrolling off :) 

### Tips

- Touches in the `Touch` and `Scroll` areas only have to start in the areas. They still register if the touch moves into another area.

- Using a drag operation to select text is cumbersome without a real mouse. Fortunately, even if there is no visible caret, there may be an invisible one. So text can be selected as if there is a caret. Chrome supports selecting text by clicking at one end of the selection, then holding shift while clicking at the other end. Firefox additionally supports creating a selection with one click then using Shift + arrow keys to make the selection.

  Firefox and Chrome both also have caret browsing modes, which can be toggled on and off with F7.

  In some windows, such as error dialog boxes, you can also try to copy the text without selecting it first, by just clicking in the window and pressing Ctrl+C. 

- Enter full screen mode by tapping the `Full` button. This issues a request for full screen to the browser. The request may be ignored, in which case the button will not cause any change. If full screen mode is activated, a swipe from the top or bottom of the screen will normally exit back to regular mode.

## Configuration

Sensitivity and related settings can be modified by changing the `const` values in `web/settings.js`.

- Sensitivity settings:

    - `TOUCH_MOVE_SENSITIVITY`
    - `WHEEL_SCROLL_SENSITIVITY`
    - `SMOOTH_SCROLL_SENSITIVITY`

    Input values are multiplied with these before they're used. Higher values increase sensitivity (less movement is required on the touchpad).

- Tap / hold / swipe thresholds:

    - `TAP_THRESHOLD_MS`
    - `TAP_RADIUS_PIXELS`

    These provide the time and radius where a touch transitions from a tap to a hold or swipe.
    
    If the mouse buttons are hard to toggle or otherwise seem finicky, you might need to adjust these.

- Enable Touch area to also pick up left clicks:

    - `TOUCH_LEFT_CLICK`

- Period in ms, determines the frequency at which user input is evaluated and event trigger frequency is adjusted:

    - `SCROLL_INTERVAL_MS`

- Wait, in ms, between each attempt to reconnect a lost WebSocket connection to the desktop:

    - `WEB_SOCKET_TIMEOUT_MS`


## Host security considerations

Anyone that can connect to the WebSocket that remote-mouse opens on the desktop PC can control the mouse. It's remotely conceivable that this could be used in an attack where the attacker guesses what's on the monitor (to determine where to click), or can see the monitor through a window, or just clicks randomly to break things. If this is of concern, access to the port should be restricted, for instance with firewall rules, or by setting remote-mouse to listen only on a localhost port, and accessing it via an SSH tunnel.

## Installation

### Build on Linux

This procedure has been tested on Linux Mint 19 and 20. It should work on recent Ubuntu and other Debian derivatives as well.

You need Rust for building this. Rust usually installs with a single command, as described at:

https://www.rust-lang.org/tools/install

Then:

```shell
$ sudo apt install libxdo-dev
$ bash -c '
git clone https://github.com/rogerdahl/remote-mouse
cd remote-mouse
cargo run --release
'
```
* The link to use for connecting from the phone or tablet is printed to the shell.

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

- `Rust`, `tokio`, `warp`, `enigo`, 
  [vh-check](https://github.com/Hiswe/vh-check), and the usual suspects, ES6, CSS, jQuery, and jQuery UI. 
