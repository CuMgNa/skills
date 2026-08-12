# 路径资产（提缺录制 → 脚本回归）

设计：`docs/defect-path-regression-design.md`

## 目录

```
paths/{projectKey}/bugs/{bugId}.json   # 主资产（批量 regress 只扫这里）
paths/{module}/{scene}.json            # 可选模块路径，不进批量扫描
```

## 命令

```bash
# 提缺后录制（CDP，已登录 Chrome）
node scripts/record-path.mjs --url http://wxfb.pg8.ink/console --project wxfb --bug 3847

# 批量回归（本地有路径 ∩ 禅道 resolved）
node scripts/regress.mjs --project wxfb
node scripts/regress.mjs --project wxfb --dry-select

# 勾完 template 后批量提交
node scripts/regress-submit.mjs --batch output/handoff/regression/batches/wxfb-…
node scripts/regress-submit.mjs --batch … --yes
```
