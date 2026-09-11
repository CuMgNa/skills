import asyncio
import threading

import pytest
from fastapi import HTTPException

from s10u_tool import protocol
from s10u_tool.models import Connect, Policy, Send
from s10u_tool.service import Workbench


async def eventually(predicate):
    async with asyncio.timeout(3):
        while not predicate():
            await asyncio.sleep(0.005)


def test_slow_sqlite_worker_does_not_block_tcp(tmp_path, monkeypatch):
    async def scenario():
        service = Workbench(tmp_path)
        await service.open()
        gate, entered = threading.Event(), threading.Event()
        try:
            peer = await service.practice.start()
            await service.connect(Connect(host="127.0.0.1", port=peer["port"], device_id="2016001000", practice=True))
            await eventually(lambda: service.practice.state["client_connected"] and service.connection.state["status"] == "connected")
            original = service.store._save
            thread_ids = []
            def slow_save(kind, item):
                thread_ids.append(threading.get_ident())
                entered.set()
                gate.wait(2)
                return original(kind, item)
            monkeypatch.setattr(service.store, "_save", slow_save)
            saving = asyncio.create_task(service.store.save("environments", {"name": "slow", "host": "localhost", "port": 1}))
            await eventually(entered.is_set)
            await service.practice.send("FIND", "", "2016001000")
            await eventually(lambda: bool(service.replies.records))
            assert not saving.done()
            assert thread_ids == [service.store.thread_id]
            assert service.store.thread_id != threading.get_ident()
            gate.set()
            await saving
        finally:
            gate.set()
            await service.close()
    asyncio.run(scenario())


def test_cancelled_policy_request_still_keeps_database_and_state_consistent(tmp_path, monkeypatch):
    async def scenario():
        service = Workbench(tmp_path)
        await service.open()
        entered, release = threading.Event(), threading.Event()
        original = service.store._save_policy
        def blocked(command, policy):
            entered.set()
            release.wait(2)
            return original(command, policy)
        monkeypatch.setattr(service.store, "_save_policy", blocked)
        try:
            request = asyncio.create_task(service.replies.set_policy("FIND", Policy(mode="auto", action="ignore")))
            await eventually(entered.is_set)
            request.cancel()
            with pytest.raises(asyncio.CancelledError):
                await request
            release.set()
            await eventually(lambda: service.replies.policies["FIND"]["action"] == "ignore")
            saved = await service.store.policies()
            assert saved["FIND"] == service.replies.policies["FIND"]
        finally:
            release.set()
            await service.close()
    asyncio.run(scenario())


def test_failed_drain_keeps_exact_evidence_and_retry_does_not_write(tmp_path):
    class FailedWriter:
        def __init__(self):
            self.writes = []
        def write(self, data):
            self.writes.append(data)
        async def drain(self):
            raise OSError("simulated drain failure after write")
        def close(self):
            pass
        async def wait_closed(self):
            pass
    async def scenario():
        service = Workbench(tmp_path)
        await service.open()
        try:
            writer = FailedWriter()
            service.connection.writer = writer
            service.connection.state.update(status="connected", session_id="session", device_id="2016001000")
            request = Send(operation_id="uncertain-operation", session_id="session", draft=service.metadata["defaults"]["iccid"])
            for _ in range(2):
                with pytest.raises(HTTPException) as failure:
                    await service.send(request)
                assert failure.value.status_code == 502
            assert len(writer.writes) == 1
            logs = [item for item in service.events.logs if "uncertain-operation" in item["message"]]
            assert len(logs) == 1
            assert logs[0]["packet"]["hex"] == writer.writes[0].hex(" ").upper()
            assert logs[0]["session_id"] == "session"
            assert "uncertain" in logs[0]["message"]
            assert not [item for item in service.events.logs if item["direction"] == "tx"]
        finally:
            await service.close()
    asyncio.run(scenario())


def test_socket_send_lock_preserves_complete_write_order(tmp_path):
    class Writer:
        def __init__(self):
            self.writes = []
            self.first_drain = asyncio.Event()
            self.release = asyncio.Event()
        def write(self, data):
            self.writes.append(data)
        async def drain(self):
            if len(self.writes) == 1:
                self.first_drain.set()
                await self.release.wait()
        def close(self):
            self.release.set()
        async def wait_closed(self):
            pass
    async def scenario():
        service = Workbench(tmp_path)
        await service.open()
        writer = Writer()
        try:
            service.connection.writer = writer
            service.connection.state.update(status="connected", session_id="session", device_id="2016001000")
            one = asyncio.create_task(service.connection.send(b"one", "session"))
            await writer.first_drain.wait()
            two = asyncio.create_task(service.connection.send(b"two", "session"))
            await asyncio.sleep(0)
            assert writer.writes == [b"one"]
            writer.release.set()
            await asyncio.gather(one, two)
            assert writer.writes == [b"one", b"two"]
        finally:
            await service.close()
    asyncio.run(scenario())
