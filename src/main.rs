#[allow(dead_code)]
#[doc(inline)]
#[macro_use]
extern crate clap;
#[macro_use]
extern crate lazy_static;

use std::{thread, time};
use std::str;
use std::sync::{Arc, Mutex, MutexGuard};

use async_std::task;
use clap::{App, Arg};
use colored::*;
use enigo::{Enigo, /* Key, KeyboardControllable,*/ MouseButton, MouseControllable};
use float_extras;
use float_extras::f64::modf;
use futures::{future, StreamExt};
use local_ipaddress;
use public_ip::{BoxToResolver, dns, http, ToResolver};
use warp::Filter;
use warp::http::header::{HeaderMap, HeaderValue};

const POINTER_REFRESH_FREQ_HZ: f64 = 120.0;

#[tokio::main]
async fn main() {
    let matches = App::new("Remote Mouse")
        .arg(Arg::with_name("debug")
            .short("s")
            .long("debug")
        )
        .arg(Arg::with_name("friction")
            .short("f")
            .long("friction")
            .default_value("0.004")
            .help("Higher friction values cause the mouse pointer to slow down sooner")
            .takes_value(true)
        )
        .arg(Arg::with_name("sensitivity")
            .short("i")
            .long("sensitivity")
            .default_value("0.1")
            .help("Higher sensitivity value causes the mouse pointer to 'drift' faster")
            .takes_value(true)
        ).get_matches();

    let pointer_friction = value_t!(
        matches.value_of("friction"), f64).unwrap_or_else(|e| e.exit());
    let pointer_sensitivity = value_t!(
        matches.value_of("sensitivity"), f64).unwrap_or_else(|e| e.exit());

    // println!("friction={:?} sensitivity={:?}", pointer_friction, pointer_sensitivity);

    let mut headers = HeaderMap::new();
    headers.insert("Expires", HeaderValue::from_static("0"));
    headers.insert("Pragma", HeaderValue::from_static("no-cache"));
    headers.insert("Cache-Control", HeaderValue::from_static("no-cache"));

    // Serve index.html from /
    let index = warp::get()
        .and(warp::path::end())
        .and(warp::fs::file("./web/index.html"));

    // Serve other files from /web/<file>
    let web = warp::get()
        .and(warp::fs::dir("./web/"));

    // Prepare Enigo, which handles event injections.
    // let enigo = Arc::new(Mutex::new(Enigo::new()));

    let pointer_sensitivity = pointer_sensitivity.clone();
    let pointer_friction = pointer_friction.clone();

    let (ttx, rrx) = std::sync::mpsc::sync_channel::<(f64, f64)>(0);

    // WebSocket
    let ws = warp::path("ws")
        .and(warp::ws())
        .map(move |ws: warp::ws::Ws| {
            let ttx = ttx.clone();

            ws.on_upgrade(|websocket| {
                let (_tx, rx) = websocket.split();
                let enigo = Arc::new(Mutex::new(Enigo::new()));

                rx.for_each(move |line| {
                    let mut enigo = enigo.lock().unwrap();
                    let line = line.unwrap();
                    let line_bytes = line.as_bytes();
                    let line_str = match str::from_utf8(line_bytes) {
                        Ok(v) => v,
                        Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
                    };
                    let line_vec: Vec<&str> = line_str.split(" ").collect();

                    // For debugging, just print what was received and don't generate any events.
                    // println!("Received: {}\n", line_str);
                    // return future::ready(());

                    // Log messages start with '#'. They're just strings the client wants to
                    // display.
                    if line_vec[0] == "#" {
                        let rgb = match line_vec[1] {
                            "Debug:" => Color::TrueColor { r: 0xa0, g: 0xa0, b: 0xa0 },
                            "Info:" => Color::TrueColor { r: 0x00, g: 0xa0, b: 0x00 },
                            "Warning:" => Color::TrueColor { r: 0xff, g: 0x7c, b: 0x00 },
                            "Error:" => Color::TrueColor { r: 0xb0, g: 0x00, b: 0x00 },
                            _ => Color::TrueColor { r: 0xa0, g: 0xa0, b: 0xa0 },
                        };
                        println!("{}", &line_str[2..].color(rgb));
                        return future::ready(());
                    }

                    let mut mb = |action: &str, button: MouseButton| {
                        match action {
                            "click" => enigo.mouse_click(button),
                            "down" => enigo.mouse_down(button),
                            "up" => enigo.mouse_up(button),
                            _ => (),
                        };
                    };

                    match line_vec[0] {
                        "left" => {
                            mb(line_vec[1], MouseButton::Left);
                        }
                        "middle" => {
                            mb(line_vec[1], MouseButton::Middle);
                        }
                        "right" => {
                            mb(line_vec[1], MouseButton::Right);
                        }
                        "touch" => {
                            let x = line_vec[1].parse::<f64>().unwrap();
                            let y = line_vec[2].parse::<f64>().unwrap();
                            mouse_move_relative_err(enigo, x, y);
                            ttx.send((0.0, 0.0)).unwrap();
                        }
                        "spin" => {
                            let x = line_vec[1].parse::<f64>().unwrap();
                            let y = line_vec[2].parse::<f64>().unwrap();
                            ttx.send((x, y)).unwrap();
                        }
                        "scroll" => {
                            let y = line_vec[1].parse::<f64>().unwrap();
                            mouse_scroll_y_err(enigo, y);
                        }
                        "sleep" => {
                            let i = line_vec[1].parse::<u64>().unwrap();
                            let ms = time::Duration::from_millis(i);
                            thread::sleep(ms);
                        }
                        _ => (),
                    };

                    future::ready(())
                })
            })
            // .map(|result| {
            //     if let Err(e) = result {
            //         eprintln!("websocket error: {:?}", e);
            //     }
            // });
        });

    let enigo = Arc::new(Mutex::new(Enigo::new()));

    thread::spawn(move || {
        let ms = time::Duration::from_millis((1.0 / POINTER_REFRESH_FREQ_HZ * 1000.0) as u64);
        let mut fx = 0.0;
        let mut fy = 0.0;
        let mut speed = 0.0;
        loop {
            let enigo = enigo.lock().unwrap();
            let result = rrx.try_recv();
            if result.is_ok() {
                let (nx, ny) = result.unwrap();
                fx = nx * pointer_sensitivity;
                fy = ny * pointer_sensitivity;
                speed = 1.0;
            }
            mouse_move_relative_err(enigo, fx * speed, fy * speed);
            if speed > 0.0 {
                speed -= pointer_friction;
            }
            thread::sleep(ms);
        }
    });

    let routes = index.or(web).or(ws).with(warp::reply::with::headers(headers));

    println!("Starting remote-mouse service.");
    println!("Now browse to this machine from a phone or tablet.");
    println!("Local URL: http://{}:7780", local_ipaddress::get().unwrap());
    println!("Internet URL (normally blocked): http://{}:7780", get_public_network_addr());

    warp::serve(routes).run(([0, 0, 0, 0], 7780)).await;
}

struct CumulativeError {
    x: f64,
    y: f64,
}

lazy_static! {
    static ref POINTER_ERROR: Mutex<CumulativeError> = Mutex::new(CumulativeError { x: 0.0, y: 0.0 });
}

lazy_static! {
    static ref SCROLL_ERROR: Mutex<CumulativeError> = Mutex::new(CumulativeError { x: 0.0, y: 0.0 });
}

/// Truncate delta value {d} from f64 to i32 while tracking error.
/// See the README for more info on the cumulative error.
/// acc_err: Ref to the running total / cumulative error we have so far.
/// d: delta x or y.
fn track_cumulative_error(acc_err: f64, d: f64) -> (f64, i32) {
    let (d_int, d_frac) = modf(d);
    let (err_int, err_frac) = modf(acc_err + d_frac);
    return (err_frac, (d_int + err_int) as i32);
}

fn mouse_move_relative_err(mut enigo: MutexGuard<Enigo>, x: f64, y: f64) -> () {
    let mut pointer_error = POINTER_ERROR.lock().unwrap();
    let (err_x_, int_x) = track_cumulative_error(pointer_error.x, x);
    pointer_error.x = err_x_;
    let (err_y_, int_y) = track_cumulative_error(pointer_error.y, y);
    pointer_error.y = err_y_;
    enigo.mouse_move_relative(int_x, int_y);
}

fn mouse_scroll_y_err(mut enigo: MutexGuard<Enigo>, y: f64) -> () {
    let mut scroll_error = SCROLL_ERROR.lock().unwrap();
    let (err_y_, int_y) = track_cumulative_error(scroll_error.y, y);
    scroll_error.y = err_y_;
    enigo.mouse_scroll_y(int_y);
}

fn get_public_network_addr() -> String {
    // List of resolvers to try and get an IP address from
    let resolver = vec![
        BoxToResolver::new(dns::OPENDNS_RESOLVER),
        BoxToResolver::new(http::HTTP_IPIFY_ORG_RESOLVER),
    ].to_resolver();
    return if let Some(ip) = task::block_on(public_ip::resolve_address(resolver)) {
        String::from(ip.to_string())
    } else {
        String::from("<unavailable>")
    };
}

