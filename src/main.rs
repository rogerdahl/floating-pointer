use std::str;
use std::sync::{Arc, Mutex};

use async_std::task;
use colored::*;
use enigo::{Enigo, /* Key, KeyboardControllable,*/ MouseButton, MouseControllable};
// use async::task;
use futures::future;
use futures::stream::StreamExt;
use local_ipaddress;
use public_ip::{BoxToResolver, dns, http, ToResolver};

// use warp::Filter;

#[tokio::main]
async fn main() {
    use warp::http::header::{HeaderMap, HeaderValue};
    use warp::Filter;

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

    // WebSocket
    let ws = warp::path("ws")
        .and(warp::ws())
        .map(|ws: warp::ws::Ws| {
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

                    // println!("Received: {}\n", line_str);

                    // Log messages start with '#'
                    if line_vec[0] == "#" {
                        // This is a string the client wants to display.
                        let rgb = match line_vec[1] {
                            "Debug:" => Color::TrueColor { r: 0xa0, g: 0xa0, b: 0xa0 },
                            "Info:" => Color::TrueColor { r: 0x00, g: 0xa0, b: 0x00 },
                            "Warning:" => Color::TrueColor { r: 0xff, g: 0x7c, b: 0x00 },
                            "Error:" => Color::TrueColor { r: 0xb0, g: 0x00, b: 0x00 },
                            _ => Color::TrueColor { r: 0xa0, g: 0xa0, b: 0xa0 },
                        };
                        println!("{}", &line_str[2..].color(rgb));
                        ()
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
                        "left" => mb(line_vec[1], MouseButton::Left),
                        "middle" => mb(line_vec[1], MouseButton::Middle),
                        "right" => mb(line_vec[1], MouseButton::Right),
                        "touch" => {
                            let ix = line_vec[1].parse::<i32>().unwrap();
                            let iy = line_vec[2].parse::<i32>().unwrap();
                            enigo.mouse_move_relative(ix, iy);
                        }
                        "scroll" => {
                            let iy = line_vec[1].parse::<i32>().unwrap();
                            enigo.mouse_scroll_y(iy);
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

    let routes = index.or(web).or(ws).with(warp::reply::with::headers(headers));

    println!("Starting remote-mouse service.");
    println!("Now browse to this machine from a phone or tablet.");
    println!("Local URL: http://{}:7780", local_ipaddress::get().unwrap());
    println!("Internet URL (normally blocked): http://{}:7780", get_public_network_addr());

    warp::serve(routes).run(([0, 0, 0, 0], 7780)).await;
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

