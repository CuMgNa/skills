前置条件：
1. 英文环境，进入 Device 页 Dispatch 子页签

复现步骤：
1. 进入 Device 页 Dispatch 子页签（见截图1）

2. 查看列表表头 Device Card/Account/Number 展示

3. 观察表头换行情况

实际结果：
1. 截图显示：表头 `Device Card/Account/Number` 被折行为 `Device Card/Account/Numb` 与 `er`，字符级截断

预期结果：
1. 列宽不足时按单词边界整词换行，禁止出现 `Numb/er` 式字符级截断

2. 表头排序图标与文字不互相挤压
