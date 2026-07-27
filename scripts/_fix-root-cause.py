"""Fix: unify createbug key, set GLM default, sync CC Switch currentProviderClaude."""
import json
import sqlite3
from pathlib import Path

DB = Path.home() / ".cc-switch" / "cc-switch.db"
CLAUDE_SETTINGS = Path(r"E:\Claude\.claude\settings.json")
CC_SETTINGS = Path.home() / ".cc-switch" / "settings.json"
BACKUP = Path(r"E:\Claude\env-backup-20260727-115416.json")

TOKEN = json.loads(BACKUP.read_text(encoding="utf-8-sig"))["ANTHROPIC_AUTH_TOKEN"]
BASE = "http://192.168.0.217:8317/v1"
DEFAULT_ID = "lan-glm-5-2"

PROVIDERS = [
    ("lan-glm-5-2", "GLM-5.2", "openai_chat"),
    ("lan-k3", "K3", "openai_chat"),
    ("lan-k2-7", "K2.7", "openai_chat"),
    ("lan-minimax-m3", "MiniMax-M3", "openai_chat"),
    ("lan-claude-fable-5", "claude-fable-5", "openai_chat"),
    ("lan-grok-4-5", "grok-4.5", "openai_responses"),
    ("cn-createbug-glm", "GLM-5.2", "openai_chat"),
]


def build_env(model: str) -> dict:
    return {
        "ANTHROPIC_BASE_URL": BASE,
        "ANTHROPIC_AUTH_TOKEN": TOKEN,
        "ANTHROPIC_MODEL": model,
        "ANTHROPIC_DEFAULT_SONNET_MODEL": model,
        "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": model,
        "ANTHROPIC_DEFAULT_OPUS_MODEL": model,
        "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": model,
        "ANTHROPIC_DEFAULT_HAIKU_MODEL": model,
        "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME": model,
        "ANTHROPIC_DEFAULT_FABLE_MODEL": model,
        "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": model,
        "OPENAI_BASE_URL": BASE,
        "OPENAI_API_KEY": TOKEN,
    }


def main():
    con = sqlite3.connect(str(DB))
    cur = con.cursor()

    for pid, model, fmt in PROVIDERS:
        cur.execute(
            "UPDATE providers SET settings_config=?, meta=?, is_current=? WHERE id=? AND app_type='claude'",
            (
                json.dumps({"env": build_env(model)}),
                json.dumps({"apiFormat": fmt}),
                1 if pid == DEFAULT_ID else 0,
                pid,
            ),
        )
        print(f"updated {pid} model={model} tok={TOKEN[:8]}...")

    cur.execute("UPDATE providers SET is_current=0 WHERE app_type='claude'")
    cur.execute(
        "UPDATE providers SET is_current=1 WHERE id=? AND app_type='claude'",
        (DEFAULT_ID,),
    )
    con.commit()
    con.close()

    # Sync Claude settings.json
    sj = json.loads(CLAUDE_SETTINGS.read_text(encoding="utf-8"))
    sj["env"] = build_env("GLM-5.2")
    CLAUDE_SETTINGS.write_text(
        json.dumps(sj, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("synced E:\\Claude\\.claude\\settings.json")

    # Fix CC Switch currentProviderClaude (this was still lan-grok-4-5!)
    if CC_SETTINGS.exists():
        cc = json.loads(CC_SETTINGS.read_text(encoding="utf-8"))
        old = cc.get("currentProviderClaude")
        cc["currentProviderClaude"] = DEFAULT_ID
        cc["enableLocalProxy"] = True
        CC_SETTINGS.write_text(
            json.dumps(cc, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"currentProviderClaude: {old} -> {DEFAULT_ID}")

    print("DONE")


if __name__ == "__main__":
    main()
