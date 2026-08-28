前置条件：
1. 英文环境，救援队列表存在“北京曙光救援总队”记录

复现步骤：
1. 进入 Rescue Team Info 面板（见截图1）

2. 点击“北京曙光救援总队”查看右侧详情

3. 观察 Full Name、Short Name 等字段行

实际结果：
1. 截图显示：`Full Name`、`Short Na...` 行字段值“北京曙光救援总队”与标签存在重叠

2. 部分字段标签同时存在截断：`Short Na`、`Service Ty`、`hone`

预期结果：
1. 字段标签与值水平间距 ≥8px，同行内不重叠

2. 标签完整展示（`Short Name`/`Service Type`/`Phone`），超长以省略号截断
