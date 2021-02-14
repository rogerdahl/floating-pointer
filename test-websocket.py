#!/usr/bin/env python

"""Send mouse input to the remote-mouse WebSocket interface.
"""

import asyncio
import logging
import math
import sys
import time

import websockets

log = logging.getLogger(__name__)

def main():
    while True:
        try:
            asyncio.run(test())
        except Exception as e:
            print(str(e))
        time.sleep(1)

async def test():
    uri = "ws://localhost:7780/ws"
    async with websockets.connect(uri) as websocket:
        i, x, y = 0, 0, 0
        while True:
            xx = int(math.cos(i) * 100)
            yy = int(math.sin(i) * 100)
            msg = f'touch {x - xx} {y - yy}'
            x = xx
            y = yy
            await websocket.send(f'{msg}\n'.encode('ascii'))
            print(f'Sent: {msg}')
            time.sleep(.01)
            i += .1
            if i >= 360:
                i -= 360

if __name__ == '__main__':
    sys.exit(main())
