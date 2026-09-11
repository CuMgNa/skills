"""Application orchestration; all mutable state belongs to one event loop."""
import asyncio
import copy
import hashlib
import json

from fastapi import HTTPException

from . import protocol
from .events import Events
from .practice import Practice
from .replies import Replies
from .storage import Store
from .transport import Connection


MAX_OPERATIONS = 512
MAX_OPERATION_BYTES = 8_000_000


class Workbench:
    def __init__(self, data_dir):
        self.store = Store(data_dir)
        self.events = Events()
        self.metadata = protocol.metadata()
        commands = {item["command"] for item in self.metadata["downlinks"]}
        self.replies = Replies(self.events, self.store, commands)
        self.connection = Connection(self.events, self.replies.receive, self.replies.end_session)
        self.replies.connection = self.connection
        self.events.context = lambda: dict(self.connection.state)
        self.practice = Practice(self.events, commands)
        self.operations = {}
        self.operation_bytes = 0
        self.operation_session = None
        self.send_tasks = set()
        self.control_lock = asyncio.Lock()
        self.practice_lock = asyncio.Lock()

    async def open(self):
        await self.store.open()
        await self.replies.load()

    async def close(self):
        await self.connection.disconnect("Application shutdown")
        await self.replies.close()
        await self.practice.stop()
        if self.send_tasks:
            await asyncio.gather(*list(self.send_tasks), return_exceptions=True)
        await self.store.close()

    def snapshot(self):
        return {
            "run_id": self.events.run_id, "seq": self.events.seq,
            "connection": dict(self.connection.state), "practice": dict(self.practice.state),
            "logs": self.events.snapshot_logs(),
            "downlinks": copy.deepcopy(list(self.replies.records.values())),
            "policies": copy.deepcopy(self.replies.policies), "dropped_logs": self.events.dropped_logs,
        }

    async def connect(self, request):
        async with self.control_lock:
            if request.practice:
                state = self.practice.state
                if not state["running"] or request.host not in {"127.0.0.1", "localhost"} or request.port != state["port"]:
                    raise HTTPException(422, "Practice connection must target the running local practice listener")
            self.connection.start(request.model_dump())
        return self.snapshot()

    async def disconnect(self):
        async with self.control_lock:
            await self.connection.disconnect()
        return {"ok": True}

    async def send(self, request):
        state = self.connection.state
        if state["session_id"] != request.session_id or state["status"] != "connected":
            raise HTTPException(409, "Session is not connected or has changed")
        if self.operation_session != request.session_id:
            self.operations.clear()
            self.operation_bytes = 0
            self.operation_session = request.session_id
        identity = request.model_dump(exclude={"confirm_warnings", "operation_id"})
        digest = hashlib.sha256(json.dumps(identity, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        if prior := self.operations.get(request.operation_id):
            if prior[0] != digest:
                raise HTTPException(409, "operation_id identity conflict")
            code, payload = await asyncio.shield(prior[1])
            if code != 200:
                raise HTTPException(code, payload)
            return copy.deepcopy(payload)
        if request.raw is not None:
            data = protocol.from_raw(request.raw.value, request.raw.mode)
            packet = protocol.parse(data)
        else:
            packet = protocol.encode(request.draft)
            data = bytes.fromhex(packet["hex"])
        if not data:
            raise HTTPException(422, "Empty packets cannot be sent")
        warnings = list(packet.get("warnings", [])) + list(packet.get("errors", []))
        if packet.get("device_id") and packet["device_id"] != state["device_id"]:
            warnings.append("Packet device ID differs from the active session device ID")
        if warnings and not request.confirm_warnings:
            raise HTTPException(409, {"message": "Explicit confirmation required; raw bytes will not be corrected", "warnings": warnings})
        retained_size = len(json.dumps(packet, ensure_ascii=False).encode()) + len(data) + len(digest) + len(request.operation_id)
        if len(self.operations) >= MAX_OPERATIONS or self.operation_bytes + retained_size > MAX_OPERATION_BYTES:
            raise HTTPException(429, "Session operation retention capacity reached; disconnect/reconnect explicitly. No IDs are evicted or resent.")
        future = asyncio.get_running_loop().create_future()
        self.operations[request.operation_id] = (digest, future)
        self.operation_bytes += retained_size
        # Retrying an HTTP operation never starts a second write, including after
        # client cancellation. Identical packets with distinct IDs remain allowed.
        context = dict(state)
        task = asyncio.create_task(self._perform_send(data, packet, request.session_id, request.operation_id, future, context))
        self.send_tasks.add(task)
        task.add_done_callback(self.send_tasks.discard)
        code, payload = await asyncio.shield(future)
        if code != 200:
            raise HTTPException(code, payload)
        return copy.deepcopy(payload)

    async def _perform_send(self, data, packet, session_id, operation_id, future, context):
        try:
            await self.connection.send(data, session_id)
            log = self.events.log("tx", "Manual send once; socket write is not a platform acknowledgement", packet, **context)
            result = (200, {"log_id": log["id"], "packet": packet, "status": "sent"})
        except HTTPException as exc:
            self.events.log("event", f"Manual operation_id={operation_id}: {exc.detail}", packet, **context)
            result = (exc.status_code, exc.detail)
        except Exception as exc:
            self.events.log("event", f"Manual operation_id={operation_id}: send attempt failed: {exc}; delivery uncertain, not retried", packet, **context)
            result = (502, "Send failed; delivery uncertain, not retried")
        if not future.done():
            future.set_result(result)
