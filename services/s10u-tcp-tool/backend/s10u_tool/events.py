"""Bounded authoritative state with coalesced invalidation notifications."""
import asyncio
import copy
import uuid
from collections import deque
from datetime import datetime, timezone


MAX_LOGS = 500
MAX_LOG_BYTES = 2_000_000
MAX_DOWNLINKS = 200
MAX_SUBSCRIBERS = 32


def timestamp():
    return datetime.now(timezone.utc).isoformat()


class Events:
    def __init__(self):
        self.run_id = uuid.uuid4().hex
        self.seq = 0
        self.logs = deque()
        self._sizes = deque()
        self._bytes = 0
        self.dropped_logs = 0
        self.subscribers = set()
        self.context = lambda: {}

    def changed(self):
        self.seq += 1
        for queue in self.subscribers:
            if not queue.full():
                queue.put_nowait(None)

    def notification(self):
        return {"type": "changed", "run_id": self.run_id, "seq": self.seq}

    def subscribe(self):
        if len(self.subscribers) >= MAX_SUBSCRIBERS:
            raise ValueError("too many event subscribers")
        queue = asyncio.Queue(maxsize=1)
        self.subscribers.add(queue)
        # Register first, then enqueue initial: no subscribe/snapshot race.
        queue.put_nowait(None)
        return queue

    def log(self, direction, message, packet=None, **context):
        import json
        ctx = self.context() | context
        item = {
            "id": uuid.uuid4().hex, "time": timestamp(), "direction": direction,
            "session_id": ctx.get("session_id"),
            "environment_name": ctx.get("environment_name", ""),
            "device_id": ctx.get("device_id", ""), "message": message,
        }
        if packet is not None:
            item["packet"] = packet
        size = len(json.dumps(item, ensure_ascii=False).encode("utf-8"))
        # Very large diagnostics cannot make the snapshot itself unbounded.
        if size > MAX_LOG_BYTES:
            item.pop("packet", None)
            item["message"] = message[:2000] + " [oversize diagnostic omitted]"
            size = len(json.dumps(item, ensure_ascii=False).encode("utf-8"))
        while self.logs and (len(self.logs) >= MAX_LOGS or self._bytes + size > MAX_LOG_BYTES):
            self.logs.popleft()
            self._bytes -= self._sizes.popleft()
            self.dropped_logs += 1
        self.logs.append(item)
        self._sizes.append(size)
        self._bytes += size
        self.changed()
        return item

    def snapshot_logs(self):
        return copy.deepcopy(list(self.logs))
