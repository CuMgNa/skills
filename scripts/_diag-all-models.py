import json
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path

con = sqlite3.connect(str(Path.home() / ".cc-switch" / "cc-switch.db"))
print("=== providers ===")
for r in con.execute(
    "SELECT id,name,is_current,settings_config,meta FROM providers WHERE app_type='claude' AND settings_config!='{}' ORDER BY is_current DESC, name"
):
    pid, name, cur, cfg, meta = r
    env = json.loads(cfg).get("env", {})
    m = json.loads(meta or "{}")
    print(
        f"cur={cur} {name:18} model={env.get('ANTHROPIC_MODEL')} "
        f"base={env.get('ANTHROPIC_BASE_URL')} fmt={m.get('apiFormat')} "
        f"tok={(env.get('ANTHROPIC_AUTH_TOKEN') or '')[:8]}"
    )

print("\n=== proxy_config ===")
for r in con.execute("SELECT * FROM proxy_config WHERE app_type='claude'"):
    print(r)

ss = Path.home() / ".cc-switch" / "settings.json"
if ss.exists():
    print("\n=== cc-switch settings ===")
    print(json.dumps(json.loads(ss.read_text(encoding="utf-8")), ensure_ascii=False, indent=2)[:800])

sj = json.loads(Path(r"E:\Claude\.claude\settings.json").read_text(encoding="utf-8"))
env = sj.get("env", {})
token = env.get("ANTHROPIC_AUTH_TOKEN", "")
base = (env.get("ANTHROPIC_BASE_URL") or "").rstrip("/")
print("\n=== settings.json ===")
for k in sorted(env):
    v = env[k]
    if "TOKEN" in k or "KEY" in k:
        print(k, (v or "")[:8] + "...")
    else:
        print(k, v)

# get current token from active provider
row = con.execute(
    "SELECT settings_config FROM providers WHERE app_type='claude' AND is_current=1"
).fetchone()
cur_env = json.loads(row[0])["env"]
token = cur_env["ANTHROPIC_AUTH_TOKEN"]
base = cur_env["ANTHROPIC_BASE_URL"].rstrip("/")
con.close()


def probe(label, url, body, headers):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            text = resp.read()[:180].decode("utf-8", errors="replace")
            print(f"OK  {label}: {resp.status} {text}")
    except urllib.error.HTTPError as e:
        text = e.read()[:250].decode("utf-8", errors="replace")
        print(f"FAIL {label}: HTTP {e.code} {text}")
    except Exception as e:
        print(f"ERR  {label}: {e}")


oa = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}
anth = {
    "x-api-key": token,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
}

print("\n=== gateway probes ===")
for model in ["GLM-5.2", "K3", "K2.7", "MiniMax-M3", "claude-fable-5"]:
    probe(
        f"chat/{model}",
        f"{base}/chat/completions",
        {"model": model, "max_tokens": 8, "messages": [{"role": "user", "content": "hi"}]},
        oa,
    )
    probe(
        f"messages/{model}",
        f"{base}/messages",
        {"model": model, "max_tokens": 8, "messages": [{"role": "user", "content": "hi"}]},
        anth,
    )

print("\n=== via CC Switch 15721 (Anthropic) ===")
for model in ["GLM-5.2", "K3"]:
    probe(
        f"proxy/messages/{model}",
        "http://127.0.0.1:15721/v1/messages",
        {"model": model, "max_tokens": 8, "messages": [{"role": "user", "content": "hi"}]},
        anth,
    )
