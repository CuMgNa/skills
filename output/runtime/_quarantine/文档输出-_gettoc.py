import subprocess, json

DOC = 'docs/文档输出/天通救援棒操作手册V1.0.docx'
# Get the TOC sdt content
res = subprocess.run(
    ['officecli', 'get', DOC, '/body/sdt[1]', '--depth', '2', '--json'],
    capture_output=True, text=True, encoding='utf-8'
)
open('docs/文档输出/_toc.txt','w',encoding='utf-8').write(res.stdout[:6000])
print('exit', res.returncode)
