# 钉钉测试报告推送

## 固定配置

> ⚠️ **凭证统一归宿**：webhook token / secret / @手机号均由 `mcp/scripts/lib/qa_config.py` 统一读取，**不在本文件明文存放**。优先级：环境变量 → `~/.cursor/mcp.json` → 内置默认值。如需轮换，改环境变量或 mcp.json，**不要改 SKILL.md**。

| 配置项 | 读取方式 |
| --- | --- |
| webhook access_token | `qa_config.get_dingtalk_webhook()`；环境变量 `DINGTALK_ACCESS_TOKEN` 覆盖 |
| webhook secret | `qa_config.get_dingtalk_webhook()`；环境变量 `DINGTALK_SECRET` 覆盖 |
| @手机号 | `qa_config.get_at_mobiles()`；环境变量 `DINGTALK_AT_MOBILES`（逗号分隔）覆盖；默认 lunu |
| 默认目标文件夹 | 测试报告（名称匹配，非机密） |

## 流程步骤

### 第一步:读取测试报告并写入钉钉文档

**1.1 读取本地测试报告**
读取 Markdown 文件,提取内容。

**正文规则(严格遵循)**:
- 过滤文档主标题(第一行 `# 标题`)
- 过滤报告生成时间(`> 报告生成时间`)
- **写入钉钉文档:完整正文(包含一、二、三全部内容),不要随意删减报告内容,原始数据是怎样的就怎样**
- **推送消息:仅摘录"一、测试结果"部分**
- **严格遵循此规则,不得自行删减、修改或概括报告内容**

**1.2 查询目标文件夹ID**
使用 `list_nodes` 工具列出用户的钉钉文档,查找目标文件夹:
```text
list_nodes(folderId=null, pageSize=50)
```
匹配规则:
- 文件夹名称完全匹配(如"测试报告")
- 找到后记录 `nodeId`(作为 folderId)

**1.3 写入钉钉文档**
使用 `create_document` 工具创建文档:
```text
create_document(
  folderId="目标文件夹ID",
  name="文档标题(从报告标题提取)",
  markdown="报告正文内容(从一、测试结果开始)"
)
```
**内容过长处理**:分多次追加,每次调用 `update_document`:
```text
update_document(
  mode="append",
  nodeId="刚创建的文档nodeId",
  markdown="剩余内容"
)
```

**1.4 记录文档nodeId**
创建成功后,记录返回的 `nodeId`,用于后续推送消息中的链接。

### 第二步:推送钉钉机器人消息

**统一使用 `publish_report.py`**（签名/重试/限流/@校验已内置，禁止手写 requests.post）：

```powershell
python mcp/scripts/publish_report.py --bugstats "mcp/output/{项目}-bugstats-{日期}.json" --mode dingtalk --title "文档标题" --doc-url "https://alidocs.dingtalk.com/i/nodes/{nodeId}"
```

- 推送内容由脚本从 `conclusion_builder.format_conclusion`（消费 `keyIssues` + `metrics`）算法生成，钉钉 / Notion / 钉钉文档三端同源，**禁止**手写结论注入。

## 消息模板
```markdown
## 文档标题

### 一、测试结论

[由脚本算法生成的测试结论，消费 keyIssues + metrics]

---
**负责人**:@{默认 @手机号，见 qa_config.get_at_mobiles()} 请关注并优先跟进(正文里的 @手机号 必须与 at.atMobiles 一致,否则 @ 不生效)

### 附件

完整测试报告:https://alidocs.dingtalk.com/i/nodes/<nodeId>
```

## 钉钉MCP工具参考

| 工具 | 用途 |
| --- | --- |
| list_nodes | 查询文件夹ID |
| create_document | 创建文档 |
| update_document | 追加文档内容 |
| delete_document | 删除文档 |

## 注意事项
- 行距设置需手动在钉钉文档中调整(当前API不支持)
- 内容过长时分段追加避免JSON解析错误
- 机器人推送需要正确的签名算法
- 配置已写死,无需每次输入
- @负责人 行（含 @手机号）必须始终拼进 markdown 的 text，顺序固定为「测试结果 → 负责人@ → 附件」，不得在截取/概括报告时丢掉这一行。
- **@ 负责人必须同时满足两点(关键,否则 @ 不生效)**:① 手机号加入 `at.atMobiles`(或用 `at.atUserIds` 填 userId);② **markdown 的 `text` 正文里必须出现对应的 `@手机号` 文本**。只填 `atMobiles` 而正文无 `@手机号`,钉钉不会真正 @ 到人。
- 被 @ 的手机号必须是该负责人在钉钉**绑定的号码**,且**该负责人已在目标群内**,否则 @ 会静默失败。
- 手机号可能被隐私保护时,优先用 `at.atUserIds`(填 userId),此时正文写 `@{userId}`。
- @ 全员用 `at.isAtAll: True`(需机器人 / 群设置允许)。
- 推送后校验:`errcode==0` 仅表示发送成功,**不代表 @ 生效**;需确认正文已包含每个 `atMobiles` 对应的 `@手机号`。
