"""One TCP session with explicit connection generation and a single send lock."""
import asyncio
import uuid
from contextlib import suppress

from fastapi import HTTPException

from . import protocol
from .events import timestamp


class Connection:
    def __init__(self, events, on_packet, on_end):
        self.events = events
        self.on_packet = on_packet
        self.on_end = on_end
        self.generation = 0
        self.writer = None
        self.runner = None
        self.timer = None
        self.send_lock = asyncio.Lock()
        self.state = {
            "status": "disconnected", "session_id": None, "environment_id": None,
            "environment_name": "", "device_id": "", "host": "", "port": None,
            "connected_at": None, "reason": "", "practice": False,
        }

    def start(self, options):
        if self.state["status"] != "disconnected":
            raise HTTPException(409, "Stop the active/connecting session before switching")
        self.generation += 1
        generation = self.generation
        self.state.update({
            **{key: options[key] for key in ("environment_id", "environment_name", "device_id", "host", "port", "practice")},
            "status": "connecting", "session_id": uuid.uuid4().hex,
            "connected_at": None, "reason": "",
        })
        self.events.log("event", "Connecting (no automatic uplink)")
        self.runner = asyncio.create_task(self._run(generation, options))

    async def _run(self, generation, options):
        retries = 0
        first_connected = False
        try:
            while generation == self.generation:
                session_id = self.state["session_id"]
                writer = None
                try:
                    reader, writer = await asyncio.wait_for(
                        asyncio.open_connection(options["host"], options["port"]), timeout=10
                    )
                    if generation != self.generation:
                        writer.close()
                        return
                    self.writer = writer
                    self.state.update(status="connected", connected_at=timestamp(), reason="")
                    self.events.log("event", "TCP connected; no uplink sent")
                    if not first_connected and options["keep_seconds"]:
                        self.timer = asyncio.create_task(self._expire(generation, options["keep_seconds"]))
                    first_connected = True
                    await self._read(reader, generation, session_id)
                    reason = "Remote closed connection"
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    reason = f"TCP error: {type(exc).__name__}: {exc}"
                finally:
                    if writer is not None:
                        writer.close()
                        with suppress(Exception):
                            await asyncio.wait_for(writer.wait_closed(), 1)
                    if generation == self.generation:
                        self.writer = None
                        self.on_end(session_id)
                if generation != self.generation:
                    return
                self.events.log("event", reason)
                if not options["reconnect"] or retries >= options["reconnect_attempts"]:
                    self.state.update(status="disconnected", reason=reason)
                    if self.timer:
                        self.timer.cancel()
                        self.timer = None
                    self.events.changed()
                    return
                retries += 1
                self.state.update(status="reconnecting", reason=reason, connected_at=None)
                self.events.changed()
                await asyncio.sleep(options["reconnect_interval"])
                if generation != self.generation:
                    return
                self.state["session_id"] = uuid.uuid4().hex
                self.events.log("event", f"Reconnect attempt {retries}; no automatic uplink")
        except asyncio.CancelledError:
            return

    async def _read(self, reader, generation, session_id):
        framer = protocol.Framer()
        while generation == self.generation:
            chunk = await reader.read(16384)
            if not chunk:
                for residual in framer.finish():
                    self.events.log("rx", "RX residual (not an actionable downlink)", protocol.parse(residual))
                self._issues(framer)
                return
            self.events.log("rx", "RX raw chunk (exact bytes): " + chunk.hex(" "), session_id=session_id)
            for data in framer.feed(chunk):
                if generation != self.generation:
                    return
                packet = protocol.parse(data)
                self.events.log("rx", "RX decoded frame", packet, session_id=session_id)
                await self.on_packet(packet, session_id)
            self._issues(framer)

    def _issues(self, framer):
        for issue in framer.issues:
            self.events.log("event", "RX framing: " + str(issue))
        framer.issues.clear()

    async def _expire(self, generation, seconds):
        await asyncio.sleep(seconds)
        if generation == self.generation:
            await self.disconnect("Scheduled disconnect")

    async def disconnect(self, reason="Manual disconnect"):
        self.generation += 1
        session_id = self.state["session_id"]
        self.state.update(status="disconnected", reason=reason)
        self.on_end(session_id)
        current = asyncio.current_task()
        tasks = [task for task in (self.runner, self.timer) if task and task is not current]
        self.runner = self.timer = None
        writer, self.writer = self.writer, None
        for task in tasks:
            task.cancel()
        if writer:
            writer.close()
        self.events.log("event", reason)
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        if writer:
            with suppress(Exception):
                await asyncio.wait_for(writer.wait_closed(), 1)

    async def send(self, data, session_id):
        async with self.send_lock:
            writer = self.writer
            if self.state["status"] != "connected" or self.state["session_id"] != session_id or writer is None:
                raise HTTPException(409, "Session is no longer connected; packet was not sent")
            try:
                writer.write(data)
                await asyncio.wait_for(writer.drain(), 5)
            except (OSError, asyncio.TimeoutError) as exc:
                # A drain failure is ambiguous: bytes may have left the socket. Never retry.
                writer.close()
                raise HTTPException(502, "TCP send failed; delivery uncertain, no automatic retry") from exc
