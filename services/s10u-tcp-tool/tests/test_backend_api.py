import pytest
from fastapi.testclient import TestClient

from s10u_tool.app import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path), base_url="http://localhost:8765") as client:
        bootstrap = client.get("/api/bootstrap").json()
        client.headers.update({"Authorization": "Bearer " + bootstrap["token"], "Origin": "http://localhost:8765"})
        yield client


def test_preview_parse_saved_policy_persistence(tmp_path):
    def open_client():
        return TestClient(create_app(tmp_path), base_url="http://localhost:8765")
    with open_client() as client:
        bootstrap = client.get("/api/bootstrap").json()
        client.headers.update({"Authorization": "Bearer " + bootstrap["token"], "Origin": "http://localhost:8765"})
        draft = bootstrap["metadata"]["defaults"]["LK"]
        preview = client.post("/api/preview", json={"draft": draft})
        assert preview.status_code == 200, preview.text
        packet = preview.json()
        assert client.post("/api/parse", json={"mode": "hex", "value": packet["hex"]}).json()["hex"] == packet["hex"]
        assert client.post("/api/parse", json={"mode": "hex", "value": "xx"}).status_code == 422
        env = client.post("/api/saved/environments", json={"name": "local", "host": "127.0.0.1", "port": 8765}).json()
        dev = client.post("/api/saved/devices", json={"name": "device", "environment_id": env["id"], "device_id": "2016001000", "iccid": ""})
        assert dev.status_code == 200
        sample = client.post("/api/saved/samples", json={"name": "LK sample", "command": "LK", "draft": draft})
        assert sample.status_code == 200
        env["name"] = "updated"
        assert client.post("/api/saved/environments", json=env).json()["name"] == "updated"
        assert client.post("/api/policies/FIND", json={"mode": "auto", "action": "ignore", "delay": 0}).status_code == 200
        assert client.post("/api/saved/environments", json={"name": "bad", "host": "localhost", "port": 123, "sql": "DROP TABLE saved"}).status_code == 422
        assert client.post("/api/saved/sql", json={}).status_code == 404
        assert client.post("/api/saved/environments", json={"name": "", "host": "localhost", "port": 1234}).status_code == 422
        assert client.post("/api/saved/environments", json={"name": "bad", "host": "localhost", "port": ""}).status_code == 422
        assert client.post("/api/saved/samples", json={"name": "bad", "command": "AL", "draft": draft}).status_code == 422
        assert client.post("/api/policies/UNKNOWN", json={}).status_code == 404
        assert client.post("/api/policies/RESET", json={"action": "reject"}).status_code == 422
        client.post("/api/disconnect", json={})
        assert client.get("/api/state").json()["logs"]
    with open_client() as client:
        token = client.get("/api/bootstrap").json()["token"]
        assert token != bootstrap["token"]
        client.headers.update({"Authorization": "Bearer " + token, "Origin": "http://localhost:8765"})
        saved = client.get("/api/saved").json()
        assert len(saved["environments"]) == len(saved["devices"]) == len(saved["samples"]) == 1
        assert saved["environments"][0]["name"] == "updated"
        state = client.get("/api/state").json()
        assert state["logs"] == []
        assert state["downlinks"] == []
        assert state["policies"]["FIND"]["action"] == "ignore"


def test_validation_and_exports(client):
    assert client.post("/api/connect", json={"host": "localhost", "port": 0, "device_id": "1"}).status_code == 422
    assert client.post("/api/connect", json={"host": "http://localhost", "port": 1234, "device_id": "1"}).status_code == 422
    assert client.post("/api/send", json={"session_id": "x", "operation_id": "x"}).status_code == 422
    assert client.post("/api/send", json={"session_id": "x", "operation_id": "x", "raw": {"value": "aa", "mode": "text"}, "draft": {}}).status_code == 422
    assert client.post("/api/connect", json={"host": "example.invalid", "port": 1234, "device_id": "1", "practice": True}).status_code == 422
    assert client.post("/api/practice/send", json={"command": "LK", "device_id": "2016001000"}).status_code == 422
    assert client.post("/api/downlinks/missing/cancel", json={}).status_code == 404
    client.post("/api/disconnect", json={})
    exported = client.get("/api/export?format=json").json()
    assert exported["logs"]
    assert client.get("/api/export?format=json&session_id=missing").json()["logs"] == []
    text = client.get("/api/export?format=text")
    assert "attachment" in text.headers["content-disposition"]
    assert "no persisted history" in text.text
    assert client.get("/api/export?format=csv").status_code == 422
