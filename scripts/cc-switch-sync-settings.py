"""Sync current CC Switch Claude provider env into both settings.json locations."""
import json
import sqlite3
from pathlib import Path

DB = Path.home() / ".cc-switch" / "cc-switch.db"
TARGETS = [
    Path(r"E:\Claude\.claude\settings.json"),
    Path.home() / ".claude" / "settings.json",
]

con = sqlite3.connect(str(DB))
row = con.execute(
    "SELECT id, name, settings_config FROM providers WHERE app_type='claude' AND is_current=1"
).fetchone()
con.close()
if not row:
    raise SystemExit("no current Claude provider in CC Switch")

pid, name, cfg = row
env = json.loads(cfg).get("env") or {}
need = ("ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL")
missing = [k for k in need if not env.get(k)]
if missing:
    raise SystemExit(f"provider {name} missing fields: {missing}")

clean = {k: env[k] for k in need}
for t in TARGETS:
    t.parent.mkdir(parents=True, exist_ok=True)
    sj = json.loads(t.read_text(encoding="utf-8")) if t.exists() else {}
    sj["env"] = clean
    t.write_text(json.dumps(sj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {t}")

print(f"Synced -> {name} / {clean['ANTHROPIC_MODEL']} / {clean['ANTHROPIC_BASE_URL']}")
