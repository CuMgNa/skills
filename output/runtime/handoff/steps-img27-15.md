前置条件：
1. 英文环境，进入 MPM Backend 管理后台 Intercom Group 配置页

复现步骤：
1. 进入 System Settings 的 Intercom Group 配置页（见截图1）

2. 查看 Star beans deducted on creation 等配置项

3. 观察 Max group members 标签展示

实际结果：
1. 截图显示：`Star beans deducted on crea...` 标签与开关控件重叠，且标签截断

2. `Max group members (Person...` 与 `Max group members (Enterpr...` 标签截断

预期结果：
1. 标签与开关控件不重叠，水平间距 ≥8px

2. 标签完整展示，超长省略号截断，同组控件左对齐等距
