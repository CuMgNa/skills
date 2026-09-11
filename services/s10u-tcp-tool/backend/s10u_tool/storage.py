"""Small, single-thread SQLite transactions. Never persists traffic or tokens."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import os
import sqlite3
import threading
import uuid
from pathlib import Path


KINDS = frozenset({"environments", "devices", "samples"})


def default_data_dir() -> Path:
    if value := os.environ.get("S10U_TOOL_DATA_DIR"):
        return Path(value).expanduser().resolve()
    base = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local" / "share"))
    return base / "S10UTcpTool"


class Store:
    def __init__(self, directory: Path):
        self.directory = directory
        self.db = None
        self.lock_file = None
        self.thread_id = None
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="s10u-sqlite")
        self.closed = False

    async def _run(self, function, *args):
        if self.closed:
            raise RuntimeError("Store is closed")
        return await asyncio.get_running_loop().run_in_executor(self.executor, function, *args)

    async def open(self):
        await self._run(self._open)

    async def saved(self):
        return await self._run(self._saved)

    async def save(self, kind, item):
        return await self._run(self._save, kind, item)

    async def policies(self):
        return await self._run(self._policies)

    async def save_policy(self, command, policy):
        await self._run(self._save_policy, command, policy)

    async def close(self):
        if not self.closed:
            try:
                await self._run(self._close)
            finally:
                self.closed = True
                self.executor.shutdown(wait=False)

    def _open(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        self.lock_file = (self.directory / "worker.lock").open("a+b")
        # Advisory lock is owned by this process for the complete app lifespan.
        try:
            if os.name == "nt":
                import msvcrt
                self.lock_file.seek(0, 2)
                if not self.lock_file.tell():
                    self.lock_file.write(b"0")
                    self.lock_file.flush()
                self.lock_file.seek(0)
                msvcrt.locking(self.lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            self.lock_file.close()
            self.lock_file = None
            raise RuntimeError("Data directory is in use. Run exactly one worker.") from exc
        try:
            self.thread_id = threading.get_ident()
            self.db = sqlite3.connect(self.directory / "tool.sqlite3", timeout=5)
            with self.db:
                self.db.execute("CREATE TABLE IF NOT EXISTS saved (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind,id))")
                self.db.execute("CREATE TABLE IF NOT EXISTS policies (command TEXT PRIMARY KEY, payload TEXT NOT NULL)")
        except BaseException:
            self._close()
            raise

    def _connection(self):
        if self.db is None or threading.get_ident() != self.thread_id:
            raise RuntimeError("SQLite must run on its dedicated worker thread")
        return self.db

    def _saved(self):
        result = {kind: [] for kind in sorted(KINDS)}
        for kind, payload in self._connection().execute("SELECT kind,payload FROM saved ORDER BY rowid"):
            result[kind].append(json.loads(payload))
        return result

    def _save(self, kind, item):
        if kind not in KINDS:
            raise ValueError("unknown archive kind")
        item = dict(item)
        item["id"] = item.get("id") or uuid.uuid4().hex
        db = self._connection()
        with db:
            db.execute("INSERT INTO saved(kind,id,payload) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload", (kind, item["id"], json.dumps(item, ensure_ascii=False)))
        return item

    def _policies(self):
        return {command: json.loads(payload) for command, payload in self._connection().execute("SELECT command,payload FROM policies")}

    def _save_policy(self, command, policy):
        db = self._connection()
        with db:
            db.execute("INSERT INTO policies(command,payload) VALUES(?,?) ON CONFLICT(command) DO UPDATE SET payload=excluded.payload", (command, json.dumps(policy, ensure_ascii=False)))

    def _close(self):
        if self.db is not None:
            self.db.close()
            self.db = None
        if self.lock_file is not None:
            try:
                if os.name == "nt":
                    import msvcrt
                    self.lock_file.seek(0)
                    msvcrt.locking(self.lock_file.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_UN)
            finally:
                self.lock_file.close()
                self.lock_file = None
