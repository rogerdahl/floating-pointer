# ACME Remote Mouse

Control the mouse pointer on a Linux desktop using the touch screen on any phone or tablet.

## Usage

1. Run `remote-mouse` on your Linux desktop machine
2. Browse to `http://<your machine>:7780` from your phone or tablet
3. Enjoy!

## Configuration

Sensitivity on the mouse movements and scroll wheel can be adjusted by changing the `const` values at the top of `web/mouse.js`.

- `TOUCH_STEP_MULTIPLIER`: Lower values reduces the mouse movement.
- `SCROLL_STEP_HZ`: Lower values reduces the scroll speed.
- `SCROLL_LEFT_CLICK`: Set to `true` to allow taps in the scroll area to trigger left-clicks. When set to `false`, taps in the scroll area are ignored.

## Security considerations

Anyone that can connect to the WebSocket that remote-mouse opens on the desktop PC can control the mouse. It's remotely conceivable that this could be used in an attack where the attacker guesses what's on the monitor (to determine where to click), or can see the monitor through a window, or just clicks randomly to break things. If this is of concern, access to the port should be restricted, for instance with firewall rules, or by setting remote-mouse to listen only on a localhost port, and accessing it via an SSH tunnel.

## Installation

### Build on Linux

You need Rust for building this. It's a nice and streamlined install:

https://www.rust-lang.org/tools/install

Then:

```shell
$ sudo apt install libxdo-dev
$ bash -c '
  git clone https://github.com/rogerdahl/remote-mouse
  cd remote-mouse
  cargo install --path .
'
```

The program should now be in your `PATH`. Just type `remote-mouse` from anywhere.   

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
