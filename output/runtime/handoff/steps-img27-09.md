前置条件：
1. 打开大屏监控页 Data Overview 视图

复现步骤：
1. 进入大屏监控页（见截图1）

2. 查看 Real-time Location 列表与 Alarm Records 列表

3. 观察各列数据与表头对齐情况

实际结果：
1. 截图显示：Real-time Location 表 `Update Time` 列内容换行挤压，数据与表头错位

2. Alarm Records 表单元格内容换行导致行列不齐

预期结果：
1. 各列数据与表头对齐，单元格内容超宽时省略号截断，不换行挤压

2. 大屏 1920×1080 分辨率下整页无错位
