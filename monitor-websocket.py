#!/usr/bin/env python

"""Send mouse input to the remote-mouse WebSocket interface.
"""

import asyncio
import logging
import sys
import time

import websockets

log = logging.getLogger(__name__)

async def monitor_handler(websocket, path):
    while True:
        try:
            line_str = await websocket.recv()
        except websockets.exceptions.WebSocketException as e:
            # print(f"Error: {str(e)}")
            continue
        else:
            print(line_str)

def main():
    while True:
        try:
            start_server = websockets.serve(monitor_handler, "0.0.0.0", 7781)
            asyncio.get_event_loop().run_until_complete(start_server)
            asyncio.get_event_loop().run_forever()
        except Exception as e:
            print(str(e))
        time.sleep(1)

# async def test():
#     uri = "ws://localhost:7781/ws"
#     with websockets.serve(h, '').connect(uri) as websocket:
#         while True:
#             line = await websocket.read().decode('ascii')
#             print(line)
#             # time.sleep(.01)
#             # i += .1
#             # if i >= 360:
#             #     i -= 360

if __name__ == "__main__":
    sys.exit(main())
