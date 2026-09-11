"""Exact loopback authority + same-origin browser gate, then per-run bearer auth."""
import hmac
from urllib.parse import urlsplit

from starlette.responses import JSONResponse


MAX_BODY = 524288
LOOPBACK = frozenset({"localhost", "127.0.0.1", "::1"})


def authority(value):
    if not value or any(c.isspace() for c in value) or any(c in value for c in "/\\@?#,%"):
        return None
    try:
        parsed = urlsplit("http://" + value)
        if parsed.username or parsed.password or not parsed.hostname:
            return None
        if parsed.port is not None and not 1 <= parsed.port <= 65535:
            return None
        host = parsed.hostname.lower()
        canonical = f"[{host}]" if ":" in host else host
        if parsed.port is not None:
            canonical += f":{parsed.port}"
        return (host, canonical) if canonical == value.lower() else None
    except ValueError:
        return None


def origin_valid(origin):
    try:
        parsed = urlsplit(origin)
        return parsed.scheme in {"http", "https"} and authority(parsed.netloc) is not None and origin == f"{parsed.scheme}://{parsed.netloc}"
    except ValueError:
        return False


class LocalSecurity:
    def __init__(self, app, token, allowed_hosts=None, allowed_origins=None):
        self.app = app
        self.token = token
        self.allowed_hosts = None if allowed_hosts is None else {host.lower() for host in allowed_hosts}
        self.allowed_origins = set(allowed_origins or [])
        if self.allowed_hosts is not None and any(authority(host) is None for host in self.allowed_hosts):
            raise ValueError("allowed_hosts must contain exact authorities, not patterns or URLs")
        if any(not origin_valid(origin) for origin in self.allowed_origins):
            raise ValueError("allowed_origins must contain exact HTTP(S) origins")

    async def __call__(self, scope, receive, send):
        if scope["type"] not in {"http", "websocket"}:
            return await self.app(scope, receive, send)
        headers = {}
        for key, value in scope.get("headers", []):
            headers.setdefault(key.lower(), []).append(value.decode("latin-1"))
        host_values = headers.get(b"host", [])
        parsed = authority(host_values[0]) if len(host_values) == 1 else None
        permitted_host = parsed is not None and (
            parsed[1] in self.allowed_hosts if self.allowed_hosts is not None else parsed[0] in LOOPBACK
        )
        if not permitted_host:
            return await self._deny(scope, receive, send, 403, "Exact loopback Host required")
        origin_values = headers.get(b"origin", [])
        origin = origin_values[0] if len(origin_values) == 1 else None
        scheme = "https" if scope.get("scheme") in {"https", "wss"} else "http"
        same_origin = origin is not None and origin_valid(origin) and (
            origin == f"{scheme}://{host_values[0]}" or origin in self.allowed_origins
        )
        mutation = scope.get("method") not in {"GET", "HEAD", "OPTIONS", None}
        needs_origin = mutation or scope["type"] == "websocket"
        if (origin_values and not same_origin) or (needs_origin and not same_origin):
            return await self._deny(scope, receive, send, 403, "Exact same-origin Origin required")
        if any(value in {"cross-site", "same-site"} for value in headers.get(b"sec-fetch-site", [])) and not same_origin:
            return await self._deny(scope, receive, send, 403, "Cross-origin browser request denied")
        path = scope.get("path", "")
        if scope["type"] == "http" and path.startswith("/api/") and path != "/api/bootstrap":
            auth = headers.get(b"authorization", [])
            expected = "Bearer " + self.token
            if len(auth) != 1 or not hmac.compare_digest(auth[0].encode(), expected.encode()):
                return await self._deny(scope, receive, send, 401, "Bearer token required")
        if scope["type"] == "http" and mutation:
            content_type = headers.get(b"content-type", [""])
            if len(content_type) != 1 or content_type[0].split(";")[0].strip().lower() != "application/json":
                return await self._deny(scope, receive, send, 415, "JSON request body required")
            chunks = []
            size = 0
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                data = message.get("body", b"")
                size += len(data)
                if size > MAX_BODY:
                    return await self._deny(scope, receive, send, 413, "Request body too large")
                chunks.append(data)
                if not message.get("more_body"):
                    break
            replay = {"type": "http.request", "body": b"".join(chunks), "more_body": False}

            async def buffered_receive():
                nonlocal replay
                if replay is not None:
                    value, replay = replay, None
                    return value
                return await receive()

            return await self.app(scope, buffered_receive, self._secure_send(send))
        return await self.app(scope, receive, self._secure_send(send))

    @staticmethod
    def _secure_send(send):
        async def secured(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + [
                    (b"cache-control", b"no-store"), (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"), (b"x-frame-options", b"DENY"),
                    (b"content-security-policy", b"default-src 'self'; connect-src 'self' ws:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"),
                ]
            await send(message)
        return secured

    @staticmethod
    async def _deny(scope, receive, send, status, detail):
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008, "reason": detail})
        else:
            await JSONResponse({"detail": detail}, status_code=status, headers={"Cache-Control": "no-store"})(scope, receive, send)
