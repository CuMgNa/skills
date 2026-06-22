import os
import requests, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

url = os.environ.get("DINGTALK_MCP_URL")
if not url:
    sys.exit("Set DINGTALK_MCP_URL environment variable.")

headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}

payload = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
        'name': 'list_nodes',
        'arguments': {'folderId': None, 'pageSize': 50}
    }
}

r = requests.post(url, headers=headers, json=payload, timeout=30)
print(f"Status: {r.status_code}")
data = r.json()

if 'result' in data:
    content = data['result'].get('content', [])
    for item in content:
        text = item.get('text', '')
        if not text:
            continue
        inner = json.loads(text) if isinstance(text, str) else text
        nodes = inner.get('nodes', [])
        for node in nodes:
            name = node.get('name', '')
            nid = node.get('nodeId', '')
            print(f"{name} -> {nid}")
else:
    print(json.dumps(data, ensure_ascii=False)[:500])
