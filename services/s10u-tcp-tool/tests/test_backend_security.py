import asyncio
import sqlite3

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from s10u_tool.app import FRONTEND_DIST, create_app
from s10u_tool.events import Events, MAX_LOGS
from s10u_tool.security import authority
from s10u_tool.storage import Store


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path), base_url="http://127.0.0.1:8765") as client:
        token = client.get("/api/bootstrap").json()["token"]
        client.headers.update({"Authorization": "Bearer " + token, "Origin": "http://127.0.0.1:8765"})
        yield client


@pytest.mark.parametrize("host", ["localhost.evil.com", "127.0.0.1.evil.com", "127.1", "127.0.0.2", "0.0.0.0", "2130706433", "localhost.", "localhost@evil.com", "127.0.0.1:0", "127.0.0.1:65536", "[::1].evil.com", "127.0.0.1:08765"])
def test_reject_host_bypass(client, host):
    assert client.get("/api/bootstrap", headers={"Host": host}).status_code == 403


@pytest.mark.parametrize("host", ["localhost", "localhost:8765", "127.0.0.1", "127.0.0.1:8089", "[::1]", "[::1]:8089"])
def test_exact_loopback_authorities(client, host):
    assert client.get("/api/bootstrap", headers={"Host": host, "Origin": "http://" + host}).status_code == 200


def test_bearer_origin_and_no_api_docs(client):
    for path in ("/api/state", "/api/saved", "/api/export"):
        assert client.get(path, headers={"Authorization": "Bearer bad"}).status_code == 401
    assert client.post("/api/disconnect", json={}, headers={"Origin": "http://evil.com"}).status_code == 403
    assert client.post("/api/disconnect", json={}, headers={"Origin": "null"}).status_code == 403
    assert client.post("/api/disconnect", json={}, headers={"Origin": "http://127.0.0.1:8766"}).status_code == 403
    assert client.post("/api/disconnect", json={}, headers={"Origin": "http://127.0.0.1:8765/"}).status_code == 403
    headers = dict(client.headers)
    del client.headers["Origin"]
    assert client.post("/api/disconnect", json={}).status_code == 403
    client.headers.update(headers)
    assert client.post("/api/disconnect", content="{}").status_code == 415
    assert client.post("/api/disconnect", content=b"x" * 524289, headers={"Content-Type": "application/json"}).status_code == 413
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404


def test_bootstrap_cross_site_and_duplicates(client):
    del client.headers["Origin"]
    assert client.get("/api/bootstrap", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
    assert client.get("/api/bootstrap", headers=[("Host", "localhost"), ("Host", "evil.com")]).status_code == 403


def test_explicit_test_overrides_and_env_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("S10U_TOOL_DATA_DIR", str(tmp_path / "env"))
    with TestClient(create_app(allowed_hosts=["testserver"], allowed_origins=["http://testserver"])) as client:
        response = client.get("/api/bootstrap")
        assert response.status_code == 200
        assert client.app.state.service.store.directory == tmp_path / "env"
        assert "no-store" in response.headers["cache-control"]
    assert (tmp_path / "env" / "tool.sqlite3").exists()
    with TestClient(create_app(tmp_path / "explicit", allowed_hosts=["testserver"])) as client:
        assert client.app.state.service.store.directory == tmp_path / "explicit"


def test_websocket_first_frame_initial_and_unauthorized(client):
    token = client.get("/api/bootstrap").json()["token"]
    with client.websocket_connect("ws://127.0.0.1:8765/api/events", headers={"Origin": "http://127.0.0.1:8765"}) as ws:
        ws.send_json({"token": token})
        initial = ws.receive_json()
        assert initial["type"] == "changed"
        assert initial["run_id"] == client.get("/api/state").json()["run_id"]
        client.post("/api/disconnect", json={})
        changed = ws.receive_json()
        assert changed["seq"] > initial["seq"]
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://127.0.0.1:8765/api/events", headers={"Origin": "http://127.0.0.1:8765"}) as ws:
            ws.send_json({"token": "bad"})
            ws.receive_json()
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://127.0.0.1:8765/api/events", headers={"Origin": "http://evil.com"}):
            pass
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://127.0.0.1:8765/api/events", headers={"Origin": "http://127.0.0.1:8765"}) as ws:
            ws.send_bytes(b"not-json")
            ws.receive_json()
    del client.headers["Origin"]
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("ws://127.0.0.1:8765/api/events"):
            pass


def test_single_worker_store_lock_and_no_history(tmp_path):
    async def scenario():
        first, second = Store(tmp_path), Store(tmp_path)
        await first.open()
        try:
            with pytest.raises(RuntimeError, match="one worker"):
                await second.open()
            await second.close()
            names = await first._run(lambda: {row[0] for row in first.db.execute("SELECT name FROM sqlite_master WHERE type='table'")})
            assert names == {"saved", "policies"}
        finally:
            await first.close()
        replacement = Store(tmp_path)
        await replacement.open()
        await replacement.close()
    asyncio.run(scenario())


def test_bounded_log_and_coalesced_initial_notifications():
    async def scenario():
        events = Events()
        queue = events.subscribe()
        for i in range(MAX_LOGS + 50):
            events.log("event", str(i))
        assert len(events.logs) == MAX_LOGS
        assert events.dropped_logs == 50
        assert queue.qsize() == 1
        await queue.get()
        assert events.notification()["seq"] == MAX_LOGS + 50
    asyncio.run(scenario())


def test_static_build_path_is_source_relative():
    assert FRONTEND_DIST.name == "dist"
    assert FRONTEND_DIST.parent.name == "frontend"
    assert FRONTEND_DIST.parent.parent.name == "s10u-tcp-tool"


def test_cli_rejects_wildcard_and_multiworkers():
    from s10u_tool.__main__ import main
    with pytest.raises(SystemExit):
        main(["--host", "0.0.0.0"])
    with pytest.raises(SystemExit):
        main(["--workers", "2"])
