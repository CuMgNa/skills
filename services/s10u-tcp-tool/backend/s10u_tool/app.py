"""FastAPI lifecycle/API; no network activity until explicitly requested."""
import asyncio
import hmac
import json
import secrets
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Literal

from fastapi import Body, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import protocol
from .models import Connect, Device, DraftInput, Environment, Policy, PracticeSend, Raw, Reply, Sample, Send
from .security import LocalSecurity
from .service import Workbench
from .storage import default_data_dir


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(data_dir=None, *, allowed_hosts=None, allowed_origins=None):
    """Create a one-worker local app; explicit exact authority overrides support tests.

    Without overrides, only localhost/127.0.0.1/[::1] (optional exact port) are
    accepted and Origin must exactly match the request's own scheme and Host.
    Data location: explicit argument > S10U_TOOL_DATA_DIR > user local app data.
    """
    token = secrets.token_urlsafe(32)
    directory = Path(data_dir).expanduser().resolve() if data_dir is not None else default_data_dir()

    @asynccontextmanager
    async def lifespan(app):
        service = Workbench(directory)
        app.state.service = service
        try:
            await service.open()
            yield
        finally:
            await service.close()

    app = FastAPI(title="S10U Local TCP Workbench", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(LocalSecurity, token=token, allowed_hosts=allowed_hosts, allowed_origins=allowed_origins)

    def service():
        return app.state.service

    @app.exception_handler(ValueError)
    async def invalid_input(_request, exc):
        return JSONResponse({"detail": str(exc)}, status_code=422)

    @app.get("/api/bootstrap")
    async def bootstrap():
        return {"token": token, "metadata": service().metadata}

    @app.get("/api/state")
    async def state():
        return service().snapshot()

    @app.get("/api/saved")
    async def saved():
        return await service().store.saved()

    @app.post("/api/saved/{kind}")
    async def save(kind: str, item: dict = Body(...)):
        models = {"environments": Environment, "devices": Device, "samples": Sample}
        if kind not in models:
            raise HTTPException(404, "Unknown saved item kind")
        parsed = models[kind].model_validate(item)
        if kind == "samples" and parsed.command != parsed.draft.get("command"):
            raise HTTPException(422, "Sample command must agree with its draft")
        result = await service().store.save(kind, parsed.model_dump())
        service().events.changed()
        return result

    @app.post("/api/connect")
    async def connect(request: Connect):
        return await service().connect(request)

    @app.post("/api/disconnect")
    async def disconnect(_body: dict = Body(...)):
        return await service().disconnect()

    @app.post("/api/preview")
    async def preview(request: DraftInput):
        return protocol.encode(request.draft)

    @app.post("/api/parse")
    async def parse(request: Raw):
        return protocol.parse(protocol.from_raw(request.value, request.mode))

    @app.post("/api/send")
    async def send(request: Send):
        return await service().send(request)

    @app.post("/api/policies/{command}")
    async def policy(command: str, request: Policy):
        return await service().replies.set_policy(command, request)

    @app.post("/api/downlinks/{record_id}/reply")
    async def reply(record_id: str, request: Reply):
        return service().replies.claim(record_id, request)

    @app.post("/api/downlinks/{record_id}/cancel")
    async def cancel(record_id: str, _body: dict = Body(...)):
        return service().replies.cancel(record_id)

    @app.post("/api/practice/start")
    async def practice_start(_body: dict = Body(...)):
        async with service().practice_lock:
            return await service().practice.start()

    @app.post("/api/practice/stop")
    async def practice_stop(_body: dict = Body(...)):
        async with service().practice_lock:
            await service().practice.stop()
        return {"ok": True}

    @app.post("/api/practice/send")
    async def practice_send(request: PracticeSend):
        return await service().practice.send(request.command, request.parameter, request.device_id)

    @app.get("/api/export")
    async def export(format: Literal["json", "text"] = Query("json"), session_id: str | None = None):
        snapshot = service().snapshot()
        logs = snapshot["logs"]
        downlinks = snapshot["downlinks"]
        if session_id is not None:
            logs = [log for log in logs if log["session_id"] == session_id]
            downlinks = [record for record in downlinks if record["session_id"] == session_id]
        if format == "json":
            content = json.dumps({"run_id": snapshot["run_id"], "seq": snapshot["seq"], "logs": logs, "downlinks": downlinks, "dropped_logs": snapshot["dropped_logs"], "retention": "Current bounded in-memory snapshot only; no historical logs are persisted"}, ensure_ascii=False, indent=2)
            media_type, extension = "application/json", "json"
        else:
            lines = [f"Run {snapshot['run_id']} / snapshot {snapshot['seq']}; dropped logs: {snapshot['dropped_logs']}", "Current bounded in-memory snapshot only; no persisted history."]
            for log in logs:
                lines.append(f"{log['time']} [{log['direction']}] [{log['session_id']}] {log['message']}")
                if "packet" in log:
                    lines.append("HEX " + log["packet"]["hex"])
            content = "\n".join(lines)
            media_type, extension = "text/plain", "txt"
        return Response(content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="s10u-log.{extension}"'})

    @app.websocket("/api/events")
    async def events(ws: WebSocket):
        await ws.accept()
        queue = None
        tasks = []
        try:
            raw = await asyncio.wait_for(ws.receive_text(), 5)
            if len(raw) > 4096:
                await ws.close(code=1008, reason="Invalid authentication frame")
                return
            first = json.loads(raw)
            supplied = first.get("token") if isinstance(first, dict) else None
            if not isinstance(supplied, str) or not hmac.compare_digest(supplied.encode(), token.encode()):
                await ws.close(code=1008, reason="Token required in first frame")
                return
            queue = service().events.subscribe()

            async def publish():
                while True:
                    await queue.get()
                    await ws.send_json(service().events.notification())

            async def disconnect_watch():
                # Receive concurrently so idle disconnects release subscriptions.
                await ws.receive_text()
                await ws.close(code=1008, reason="Only the authentication frame is accepted")

            tasks = [asyncio.create_task(publish()), asyncio.create_task(disconnect_watch())]
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
        except (WebSocketDisconnect, asyncio.TimeoutError, ValueError, TypeError, KeyError, RuntimeError):
            with suppress(Exception):
                await ws.close(code=1008)
        finally:
            if queue is not None:
                service().events.subscribers.discard(queue)
            for task in tasks:
                task.cancel()
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    else:
        @app.get("/")
        async def frontend_missing():
            return JSONResponse({"detail": "Frontend build not found. Build frontend/dist, then restart the server."}, status_code=503)
    return app
