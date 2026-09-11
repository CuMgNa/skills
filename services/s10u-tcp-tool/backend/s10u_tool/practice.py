"""Real localhost TCP peer; acknowledges only LK and AL, never simulates devices."""
import asyncio
from contextlib import suppress

from fastapi import HTTPException

from . import protocol


class Practice:
    def __init__(self, events, commands):
        self.events = events
        self.commands = commands
        self.server = None
        self.writer = None
        self.handlers = set()
        self.lock = asyncio.Lock()
        self.state = {"running": False, "host": "127.0.0.1", "port": None, "client_connected": False}

    async def start(self):
        if self.server:
            return dict(self.state)
        self.server = await asyncio.start_server(self._client, "127.0.0.1", 0)
        self.state.update(running=True, port=self.server.sockets[0].getsockname()[1])
        self.events.log("practice", "Local TCP practice server started")
        return dict(self.state)

    async def stop(self):
        server, self.server = self.server, None
        self.state.update(running=False, port=None, client_connected=False)
        if server:
            server.close()
        writer, self.writer = self.writer, None
        if writer:
            writer.close()
        tasks = list(self.handlers)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        if server:
            # Python 3.12 waits for accepted transports as well as the listener.
            # Close clients before wait_closed or stopping a live peer deadlocks.
            await asyncio.wait_for(server.wait_closed(), 2)
        self.events.log("practice", "Local TCP practice server stopped")

    async def _client(self, reader, writer):
        task = asyncio.current_task()
        self.handlers.add(task)
        if self.writer is not None or not self.state["running"]:
            writer.close()
            with suppress(Exception):
                await writer.wait_closed()
            self.handlers.discard(task)
            return
        self.writer = writer
        self.state["client_connected"] = True
        self.events.log("practice", "Local TCP peer accepted a client")
        framer = protocol.Framer()
        try:
            while chunk := await reader.read(16384):
                self.events.log("practice", "Practice RX raw chunk: " + chunk.hex(" "))
                for data in framer.feed(chunk):
                    packet = protocol.parse(data)
                    self.events.log("practice", "Practice RX decoded frame", packet)
                    if packet.get("command") in {"LK", "AL"} and not packet.get("errors"):
                        ack = protocol.frame(content=packet["command"], device_id=packet["device_id"], manufacturer=packet["manufacturer"])
                        async with self.lock:
                            if self.writer is not writer:
                                return
                            writer.write(ack)
                            await asyncio.wait_for(writer.drain(), 5)
                        self.events.log("practice", "Practice TX LK/AL acknowledgement only", protocol.parse(ack))
                for issue in framer.issues:
                    self.events.log("practice", "Practice framing: " + str(issue))
                framer.issues.clear()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            self.events.log("practice", f"Practice socket error: {exc}")
        finally:
            writer.close()
            with suppress(Exception):
                await asyncio.wait_for(writer.wait_closed(), 1)
            if self.writer is writer:
                self.writer = None
                self.state["client_connected"] = False
                self.events.changed()
            self.handlers.discard(task)

    async def send(self, command, parameter, device_id):
        if command not in self.commands:
            raise HTTPException(422, "Practice supports only the seven documented downlinks")
        content = command + ("," + parameter if parameter else "")
        data = protocol.frame(content=content, device_id=device_id, manufacturer="3G")
        async with self.lock:
            writer = self.writer
            if writer is None or not self.state["running"]:
                raise HTTPException(409, "No local practice TCP client is connected")
            try:
                writer.write(data)
                await asyncio.wait_for(writer.drain(), 5)
            except (OSError, asyncio.TimeoutError) as exc:
                raise HTTPException(502, "Practice send failed; delivery uncertain, not retried") from exc
        packet = protocol.parse(data)
        self.events.log("practice", "Practice TX downlink (actual socket write)", packet)
        return {"packet": packet}
