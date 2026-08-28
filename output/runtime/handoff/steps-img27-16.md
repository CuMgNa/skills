前置条件：
1. 英文环境，进入 MPM Backend 管理后台 Starbean Config 配置页

复现步骤：
1. 进入 System Settings 的 Starbean Config 配置页（见截图1）

2. 查看 Position starbean price 与 Voice starbean price 配置项

3. 观察两列标签展示

实际结果：
1. 截图显示：`Position starbean price (dedu...`、`Voice starbean price (deduct...` 标签截断

2. 右列标签文字碎片相互重叠（如 `...r-bytes published:` 重叠显示）

预期结果：
1. 标签完整展示，不截断不重叠，超长省略号截断

2. 两列布局列间距一致，同行控件垂直对齐
