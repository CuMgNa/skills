import asyncio
import copy
from contextlib import asynccontextmanager, suppress

import pytest
from fastapi import HTTPException

from s10u_tool import protocol
from s10u_tool.models import Connect, Policy, Reply, Send
from s10u_tool.service import Workbench


async def eventually(predicate, timeout=3):
    async with asyncio.timeout(timeout):
        while not predicate():
            await asyncio.sleep(0.005)


@asynccontextmanager
async def workbench(tmp_path):
    service = Workbench(tmp_path)
    await service.open()
    try:
        yield service
    finally:
        await service.close()


async def connect_practice(service, **extra):
    peer = await service.practice.start()
    await service.connect(Connect(host=peer["host"], port=peer["port"], practice=True, device_id="2016001000", **extra))
    await eventually(lambda: service.connection.state["status"] == "connected" and service.practice.state["client_connected"])
    return service.connection.state["session_id"]


@pytest.fixture
def run():
    return asyncio.run


def test_actual_local_practice_seven_commands_and_only_lk_al_ack(tmp_path, run):
    async def scenario():
        async with workbench(tmp_path) as service:
            session_id = await connect_practice(service)
            assert not [log for log in service.events.logs if log["direction"] == "tx"]
            assert not [log for log in service.events.logs if log["message"].startswith("Practice RX")]
            # Seven real TCP downlinks; simulation responses never invoke a device.
            params = {"UPLOAD": "600", "ZONE": "8"}
            for command in service.practice.commands:
                await service.replies.set_policy(command, Policy(mode="auto", action="normal"))
                await service.practice.send(command, params.get(command, ""), "2016001000")
            await eventually(lambda: len(service.replies.records) == 7 and all(record["status"] == "replied" for record in service.replies.records.values()))
            await eventually(lambda: sum(log["message"] == "Practice RX decoded frame" for log in service.events.logs) >= 7)
            assert not [log for log in service.events.logs if log["message"].startswith("Practice TX LK/AL")]
            for command in ("LK", "iccid", "UD", "UD2", "AL"):
                await service.send(Send(operation_id=command, session_id=session_id, draft=service.metadata["defaults"][command]))
            await eventually(lambda: sum(log["message"] == "Practice TX LK/AL acknowledgement only" for log in service.events.logs) == 2)
            replies = [log["packet"]["command"] for log in service.events.logs if log["message"] == "Practice TX LK/AL acknowledgement only"]
            assert replies == ["LK", "AL"]
            assert len(service.replies.records) == 7  # LK/AL responses aren't downlinks.
    run(scenario())


def test_operation_id_idempotency_distinct_manual_duplicates_and_raw_confirmation(tmp_path, run, monkeypatch):
    async def scenario():
        async with workbench(tmp_path) as service:
            session_id = await connect_practice(service)
            draft = service.metadata["defaults"]["iccid"]
            request = Send(operation_id="op1", session_id=session_id, draft=draft)
            first, second = await asyncio.gather(service.send(request), service.send(request))
            assert first == second
            await eventually(lambda: sum(log["message"] == "Practice RX decoded frame" for log in service.events.logs) == 1)
            await service.send(request.model_copy(update={"operation_id": "op2"}))
            await eventually(lambda: sum(log["message"] == "Practice RX decoded frame" for log in service.events.logs) == 2)
            bad = copy.deepcopy(draft)
            bad["device_id"] = "9999999999"
            with pytest.raises(HTTPException) as conflict:
                await service.send(Send(operation_id="op1", session_id=session_id, draft=bad, confirm_warnings=True))
            assert conflict.value.status_code == 409
            raw = protocol.frame("iccid,123", device_id="9999999999").decode()
            raw_request = Send(operation_id="raw", session_id=session_id, raw={"value": raw, "mode": "text"})
            with pytest.raises(HTTPException) as confirmation:
                await service.send(raw_request)
            assert confirmation.value.status_code == 409
            assert "warnings" in confirmation.value.detail
            result = await service.send(raw_request.model_copy(update={"confirm_warnings": True}))
            assert result["packet"]["hex"] == raw.encode().hex(" ").upper()
            import s10u_tool.service as module
            monkeypatch.setattr(module, "MAX_OPERATIONS", len(service.operations))
            assert await service.send(request) == first  # capacity never evicts old IDs.
            with pytest.raises(HTTPException) as capacity:
                await service.send(request.model_copy(update={"operation_id": "new"}))
            assert capacity.value.status_code == 429
    run(scenario())


def test_delayed_cancel_replace_and_old_session_fence(tmp_path, run):
    async def scenario():
        async with workbench(tmp_path) as service:
            session = await connect_practice(service)
            await service.practice.send("FIND", "", "2016001000")
            await eventually(lambda: len(service.replies.records) == 1)
            record = next(iter(service.replies.records.values()))
            record_id = record["id"]
            assert service.replies.claim(record_id, Reply(delay=0.2))["status"] == "scheduled"
            with pytest.raises(HTTPException) as duplicate:
                service.replies.claim(record_id, Reply())
            assert duplicate.value.status_code == 409
            await asyncio.sleep(0.01)  # A has entered sleep before cancellation.
            service.replies.cancel(record_id)
            service.replies.claim(record_id, Reply(delay=0.03))
            await asyncio.sleep(0)
            assert record["status"] == "scheduled"
            with pytest.raises(HTTPException):
                service.replies.claim(record_id, Reply(delay=0.01))
            await eventually(lambda: record["status"] == "replied")
            assert sum(log["direction"] == "tx" for log in service.events.logs) == 1
            with pytest.raises(HTTPException):
                service.replies.claim(record_id, Reply())
            await service.practice.send("CR", "", "2016001000")
            await eventually(lambda: len(service.replies.records) == 2)
            old = list(service.replies.records.values())[-1]
            service.replies.claim(old["id"], Reply(delay=0.1))
            await service.disconnect()
            assert old["status"] == "cancelled"
            await eventually(lambda: not service.practice.state["client_connected"])
            new_session = await connect_practice(service)
            assert new_session != session
            with pytest.raises(HTTPException) as old_reply:
                service.replies.claim(old["id"], Reply())
            assert old_reply.value.status_code == 409
            with pytest.raises(HTTPException):
                await service.send(Send(operation_id="old", session_id=session, draft=service.metadata["defaults"]["LK"]))
            await asyncio.sleep(0.15)
            assert old["status"] == "cancelled"
    run(scenario())


def test_timed_disconnect_and_reconnect_default_off(tmp_path, run):
    async def scenario():
        async with workbench(tmp_path) as service:
            await connect_practice(service, keep_seconds=0.03, reconnect=True, reconnect_interval=0.1)
            await eventually(lambda: service.connection.state["status"] == "disconnected")
            assert service.connection.state["reason"] == "Scheduled disconnect"
            await asyncio.sleep(0.05)
            assert service.connection.state["status"] == "disconnected"
            await eventually(lambda: not service.practice.state["client_connected"])
            await connect_practice(service)
            await service.practice.stop()
            await eventually(lambda: service.connection.state["status"] == "disconnected")
            assert service.connection.state["reason"] == "Remote closed connection"
    run(scenario())


def test_explicit_abnormal_reconnect_sends_zero_bytes(tmp_path, run):
    async def scenario():
        accepted = asyncio.Queue()
        async def peer(reader, writer):
            await accepted.put((reader, writer))
        server = await asyncio.start_server(peer, "127.0.0.1", 0)
        writers = []
        try:
            async with workbench(tmp_path) as service:
                await service.connect(Connect(host="127.0.0.1", port=server.sockets[0].getsockname()[1], device_id="2016001000", reconnect=True, reconnect_interval=0.1, reconnect_attempts=1))
                reader, writer = await asyncio.wait_for(accepted.get(), 2)
                writers.append(writer)
                await eventually(lambda: service.connection.state["status"] == "connected")
                old_session = service.connection.state["session_id"]
                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(reader.read(1), 0.03)
                writer.close()
                await writer.wait_closed()
                reader2, writer2 = await asyncio.wait_for(accepted.get(), 2)
                writers.append(writer2)
                await eventually(lambda: service.connection.state["status"] == "connected" and service.connection.state["session_id"] != old_session)
                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(reader2.read(1), 0.03)
                writer2.close()
                await writer2.wait_closed()
                await eventually(lambda: service.connection.state["status"] == "disconnected")
                assert not [log for log in service.events.logs if log["direction"] == "tx"]
        finally:
            for writer in writers:
                writer.close()
            server.close()
            await server.wait_closed()
    run(scenario())


def test_disconnect_cancels_pending_connect_and_blocks_switch(tmp_path, run, monkeypatch):
    async def scenario():
        async with workbench(tmp_path) as service:
            started = asyncio.Event()
            async def pending(*args, **kwargs):
                started.set()
                await asyncio.Future()
            monkeypatch.setattr(asyncio, "open_connection", pending)
            request = Connect(host="localhost", port=1234, device_id="2016001000")
            await service.connect(request)
            await started.wait()
            with pytest.raises(HTTPException) as active:
                await service.connect(request)
            assert active.value.status_code == 409
            await service.disconnect()
            assert service.connection.state["status"] == "disconnected"
            assert service.connection.runner is None
    run(scenario())
