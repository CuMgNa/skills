import os
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = os.environ.get("DINGTALK_MCP_URL")
if not MCP_URL:
    sys.exit("Set DINGTALK_MCP_URL environment variable.")
HEADERS = {'Content-Type': 'application/json', 'Accept': 'application/json'}
FOLDER_ID = '4lgGw3P8vRrjRBkPIpYeXAMN85daZ90D'
DOC_NAME = '位置监控平台-国际化 测试报告 2026-06-12'

# Read the report content
with open(r'C:\Users\33606\Desktop\skills\skill\mcp\output\位置监控平台-国际化 测试报告 2026-06-12.md', 'r', encoding='utf-8') as f:
    full_content = f.read()

# Extract body after first H1 and after report generation time
lines = full_content.split('\n')
body_lines = []
skip = True
for line in lines:
    if skip and (line.startswith('## ') or (line.startswith('##') and not line.startswith('## '))):
        skip = False
        continue
    if skip:
        if line.startswith('> 报告生成时间') or line.startswith('> 报告'):
            continue
        continue
    body_lines.append(line)

body = '\n'.join(body_lines).strip()

# Split body into sections for chunked writing
# Section 1: 一、测试结果 + 二、未解决问题汇总
# Section 2: 三、缺陷附件
sections = re.split(r'\n### 三、缺陷附件', body)
section1 = sections[0].strip()
section2 = '### 三、缺陷附件\n' + sections[1].strip() if len(sections) > 1 else ''

print(f"Section1 length: {len(section1)}")
print(f"Section2 length: {len(section2)}")

# Step 1: Create document
payload = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
        'name': 'create_document',
        'arguments': {
            'folderId': FOLDER_ID,
            'name': DOC_NAME,
            'markdown': section1
        }
    }
}

r = requests.post(MCP_URL, headers=HEADERS, json=payload, timeout=30)
print(f"Create doc status: {r.status_code}")
result = r.json()
print(f"Create doc response: {json.dumps(result, ensure_ascii=False)[:500]}")

node_id = None
if 'result' in result:
    for item in result['result'].get('content', []):
        text = item.get('text', '')
        if text:
            inner = json.loads(text) if isinstance(text, str) else text
            node_id = inner.get('nodeId') or inner.get('documentId')
            if not node_id:
                m = re.search(r'"nodeId"\s*:\s*"([^"]+)"', text)
                if m:
                    node_id = m.group(1)
            print(f"NodeId: {node_id}")
            break

if node_id and section2:
    # Step 2: Append section 2
    payload2 = {
        'jsonrpc': '2.0',
        'id': 2,
        'method': 'tools/call',
        'params': {
            'name': 'update_document',
            'arguments': {
                'nodeId': node_id,
                'mode': 'append',
                'markdown': section2
            }
        }
    }
    r2 = requests.post(MCP_URL, headers=HEADERS, json=payload2, timeout=30)
    print(f"Append status: {r2.status_code}")
    print(f"Append response: {r2.text[:500]}")

if node_id:
    print(f"\nFINAL_NODE_ID={node_id}")
    print(f"DOC_URL=https://alidocs.dingtalk.com/i/nodes/{node_id}")
