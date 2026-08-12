import subprocess, json

DOC = 'docs/文档输出/天通救援棒操作手册V1.0.docx'
res = subprocess.run(
    ['officecli', 'query', DOC, 'paragraph[style=heading 1],paragraph[style=heading 2],paragraph[style=heading 3]', '--json'],
    capture_output=True, text=True, encoding='utf-8'
)
d = json.loads(res.stdout, strict=False)
h1=h2=h3=0
for r in d['data']['results']:
    s = r.get('style','')
    if s=='heading 1': h1+=1
    elif s=='heading 2': h2+=1
    elif s=='heading 3': h3+=1
print(f"h1={h1} h2={h2} h3={h3}")
# show heading 1 titles
print("\n--- h1 ---")
for r in d['data']['results']:
    if r.get('style')=='heading 1':
        print(f"  {r.get('text','').strip()}")
