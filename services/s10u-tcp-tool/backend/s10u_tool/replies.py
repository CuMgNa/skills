"""Downlink policy/claims. Delayed work is always scoped to its original session."""
import asyncio
import copy
import uuid
from collections import OrderedDict
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from . import protocol
from .events import MAX_DOWNLINKS, timestamp
from .models import Policy, Reply


class Replies:
    def __init__(self, events, store, commands):
        self.events = events
        self.store = store
        self.commands = commands
        self.connection = None
        self.records = OrderedDict()
        self.tasks = {}
        self.policy_tasks = set()
        self.policy_lock = asyncio.Lock()
        self.policies = {command: Policy().model_dump() for command in commands}

    async def load(self):
        for command, policy in (await self.store.policies()).items():
            if command in self.commands:
                self.policies[command] = Policy.model_validate(policy).model_dump()

    async def set_policy(self, command, policy):
        if command not in self.commands:
            raise HTTPException(404, "Unknown downlink command")
        if policy.action == "reject" and not policy.raw:
            raise HTTPException(422, "No generic reject packet is defined; provide explicit raw response")
        if policy.action == "reject":
            protocol.from_raw(policy.raw, policy.raw_mode)
        value = policy.model_dump()
        if len(self.policy_tasks) >= 32:
            raise HTTPException(429, "Too many pending policy updates")

        async def commit():
            async with self.policy_lock:
                await self.store.save_policy(command, value)
                self.policies[command] = value
                self.events.changed()
                return value

        # A disconnected HTTP caller must not leave committed SQLite policy and
        # authoritative in-memory policy disagreeing. Finish both as one job.
        task = asyncio.create_task(commit())
        self.policy_tasks.add(task)
        task.add_done_callback(self.policy_tasks.discard)
        return await asyncio.shield(task)

    async def receive(self, packet, session_id):
        command = packet.get("command")
        if command not in self.commands:
            return
        while len(self.records) >= MAX_DOWNLINKS:
            old_id, _ = self.records.popitem(last=False)
            task = self.tasks.pop(old_id, None)
            if task:
                task.cancel()
            self.events.log("event", "Oldest downlink evicted; any pending reply cancelled")
        record = {
            "id": uuid.uuid4().hex, "time": timestamp(), "session_id": session_id,
            "packet": packet, "status": "pending", "message": "Awaiting policy/manual action",
        }
        self.records[record["id"]] = record
        self.events.changed()
        policy = self.policies[command]
        if policy["mode"] == "auto":
            try:
                self.claim(record["id"], Reply.model_validate({k: v for k, v in policy.items() if k != "mode"}))
            except (ValueError, HTTPException) as exc:
                record.update(status="failed", message=str(getattr(exc, "detail", exc)))
                self.events.log("event", "Automatic receipt rejected: " + record["message"])

    def get(self, record_id):
        if record_id not in self.records:
            raise HTTPException(404, "Downlink no longer retained in bounded memory")
        return self.records[record_id]

    def _live(self, record):
        state = self.connection.state
        if state["status"] != "connected" or state["session_id"] != record["session_id"]:
            raise HTTPException(409, "Downlink belongs to an inactive session")

    def claim(self, record_id, reply):
        record = self.get(record_id)
        self._live(record)
        if record["status"] not in {"pending", "cancelled"}:
            raise HTTPException(409, "Reply already claimed; cancel a scheduled reply before replacing it")
        data = None
        if reply.action == "normal":
            data = protocol.normal_reply(record["packet"], version=reply.version)
        elif reply.action == "reject":
            if not reply.raw:
                raise HTTPException(422, "No generic reject defined; provide exact raw bytes")
            data = protocol.from_raw(reply.raw, reply.raw_mode)
            if not data:
                raise HTTPException(422, "Reject response must not be empty")
        # No await between status check and claim: concurrent requests cannot both win.
        if reply.action == "ignore":
            record.update(status="ignored", message="Explicitly ignored; no packet sent")
            record.pop("scheduled_at", None)
        else:
            record.update(status="scheduled" if reply.delay else "sending", message="Receipt claimed")
            if reply.delay:
                record["scheduled_at"] = (datetime.now(timezone.utc) + timedelta(seconds=reply.delay)).isoformat()
            task = asyncio.create_task(self._deliver(record, data, reply.delay, self.events.context()))
            self.tasks[record_id] = task
        self.events.changed()
        return copy.deepcopy(record)

    async def _deliver(self, record, data, delay, context):
        task = asyncio.current_task()
        try:
            if delay:
                await asyncio.sleep(delay)
            if self.tasks.get(record["id"]) is not task:
                return
            self._live(record)
            record.update(status="sending", message="Writing simulated receipt")
            record.pop("scheduled_at", None)
            self.events.changed()
            await self.connection.send(data, record["session_id"])
            packet = protocol.parse(data)
            record.update(status="replied", message="Socket write completed; not proof of platform processing", reply_packet=packet)
            self.events.log("tx", "Downlink receipt simulation (no physical device action)", packet, **context)
        except asyncio.CancelledError:
            if self.tasks.get(record["id"]) is not task:
                return
            if record["status"] == "sending":
                record.update(status="failed", message="Session ended during send; delivery uncertain, not retried")
            elif record["status"] == "scheduled":
                record.update(status="cancelled", message="Delayed receipt cancelled")
        except Exception as exc:
            record.update(status="failed", message=str(getattr(exc, "detail", exc)))
            self.events.log("event", f"Receipt id={record['id']} failed: " + record["message"], protocol.parse(data), **context)
        finally:
            if self.tasks.get(record["id"]) is task:
                self.tasks.pop(record["id"], None)
            self.events.changed()

    def cancel(self, record_id):
        record = self.get(record_id)
        if record["status"] not in {"pending", "scheduled", "cancelled"}:
            raise HTTPException(409, "A started/completed receipt cannot be cancelled or resent")
        task = self.tasks.pop(record_id, None)
        if task:
            task.cancel()
        record.update(status="cancelled", message="Receipt cancelled")
        record.pop("scheduled_at", None)
        self.events.changed()
        return copy.deepcopy(record)

    def end_session(self, session_id):
        for record in self.records.values():
            if record["session_id"] == session_id:
                task = self.tasks.pop(record["id"], None)
                if task:
                    task.cancel()
                if record["status"] in {"pending", "scheduled"}:
                    record.update(status="cancelled", message="Session ended; delayed receipt cancelled")
                    record.pop("scheduled_at", None)
                elif record["status"] == "sending":
                    record.update(status="failed", message="Session ended during send; delivery uncertain, not retried")
        self.events.changed()

    async def close(self):
        tasks = list(self.tasks.values())
        self.tasks.clear()
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        if self.policy_tasks:
            await asyncio.gather(*list(self.policy_tasks), return_exceptions=True)
