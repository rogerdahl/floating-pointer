use std::str;
use warp::Filter;

use enigo::{Enigo, /* Key, KeyboardControllable,*/ MouseControllable, MouseButton};

// use async::task;
use futures::future;
use futures::stream::{StreamExt};
use std::sync::{Arc, Mutex};

use async_std::task;
use public_ip::{dns, http, BoxToResolver, ToResolver};
use local_ipaddress;

#[tokio::main]
async fn main() {
    //pretty_env_logger::init();

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
                    let line = line.unwrap();
                    let line_bytes = line.as_bytes();
                    let line_str = match str::from_utf8(line_bytes) {
                        Ok(v) => v,
                        Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
                    };
                    //println!("Received: {:?}", line_str);
                    let line_vec: Vec<&str> = line_str.split(" ").collect();
                    let mut enigo = enigo.lock().unwrap();
                    let verb = line_vec[0];

                    if verb == "left" {
                        enigo.mouse_click(MouseButton::Left);
                    } else if verb == "left-down" {
                        enigo.mouse_down(MouseButton::Left);
                    } else if verb == "left-up" {
                        enigo.mouse_up(MouseButton::Left);
                    } else if verb == "right" {
                        enigo.mouse_click(MouseButton::Right);
                    } else if verb == "right-down" {
                        enigo.mouse_down(MouseButton::Right);
                    } else if verb == "right-up" {
                        enigo.mouse_up(MouseButton::Right);
                    }
                    if verb == "touch" {
                        let ix = line_vec[1].parse::<i32>().unwrap();
                        let iy = line_vec[2].parse::<i32>().unwrap();
                        enigo.mouse_move_relative(ix, iy);
                    } else if verb == "scroll" {
                        let iy = line_vec[1].parse::<i32>().unwrap();
                        enigo.mouse_scroll_y(iy);
                    }
                    future::ready(())
                })
                // .map(|result| {
                //    if let Err(e) = result {
                //       eprintln!("websocket error: {:?}", e);
                // }
            })
        });

    let routes = index.or(web).or(ws);
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

