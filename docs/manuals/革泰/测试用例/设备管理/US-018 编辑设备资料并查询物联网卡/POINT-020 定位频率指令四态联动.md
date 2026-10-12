# US-018 编辑设备资料并查询物联网卡
> 口径依据：唯一业务需求真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 5.4、5.7、5.9 节。频率任务仅沿用 SENDING、SENT、FAILURE、CANCEL 四态；SENDING 与 SENT 均不代表已生效，取消结果需结合 cancelResolution，只有可靠成功反馈才更新 confirmedValue。

## [P1] 验证 SENDING 与 SENT 均保持目标值设置中展示
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1151 的 confirmedValue 为 600 秒
  2. 最新目标为 3600 秒，commandId 为 cmd-loc-1151
- 测试步骤
  1. 将 cmd-loc-1151 状态置为 SENDING 并打开编辑页。
  2. 将同一任务推进为 SENT 但不注入成功反馈，再次刷新编辑页。
  3. 查看设备卡片和 confirmedValue。
- 预期结果
  1. SENDING 时编辑页显示 1 小时并标记“设置中”。
  2. SENT 时仍显示 1 小时“设置中”，不得宣称终端已按新频率运行。
  3. 卡片始终显示确认值 10 分钟，confirmedValue 仍为 600 秒。

## [P3][反向] 验证容量校验失败请求直接形成 FAILURE 且不替换有效目标
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1152 的 confirmedValue 为 600 秒
  2. configSequence 61 的 1800 秒任务处于 SENT，当前 desiredValue 为 1800 秒
  3. 普通队列容量已满，待提交目标为 3600 秒，幂等键为 idem-loc-1152-cap-01
- 测试步骤
  1. 打开编辑页确认显示自定义 30 分钟“设置中”。
  2. 选择 1 小时并点击整页 Save，使请求到达服务端并命中容量校验失败。
  3. 查询服务端分层值和指令记录后刷新编辑页。
- 预期结果
  1. 保存前最新有效目标为 1800 秒，编辑页展示自定义 30 分钟“设置中”。
  2. 容量校验失败请求直接创建参数 3600 秒的 FAILURE 记录并保留“普通队列容量已满”原因，不先写入 desiredValue 或 processingValue。
  3. desiredValue 仍为 1800 秒，页面继续显示自定义 30 分钟“设置中”，confirmedValue 保持 600 秒，原任务与失败记录均保留。

## [P1] 验证 CANCEL 的确认结果与待定结果采用不同回退规则
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1153 的 confirmedValue 为 600 秒
  2. sequence 71 的 1800 秒目标仍有效
  3. sequence 72 的 3600 秒目标为最新任务
- 测试步骤
  1. 将 sequence 72 置为 CANCEL 且 cancelResolution 为 PENDING，观察页面和服务端上下文。
  2. 刷新任务数据并核对 sequence 72 的目标参数。
  3. 将取消结果更新为 CONFIRMED，再次刷新编辑页。
- 预期结果
  1. 页面可按取消交互暂时回退到 30 分钟目标，但服务端不得销毁 3600 秒目标上下文。
  2. sequence 72 的 commandId、attemptId、参数 3600 秒和状态上下文仍可恢复。
  3. 取消最终确认后 sequence 72 不再是有效目标，页面稳定展示 sequence 71 的 30 分钟“设置中”。

## [P1] 验证 CANCEL 待定后回写 SENT 恢复在途目标
- 测试类型
  - 可靠性
- 前置条件
  1. 设备 GT-LOC-1154 的 confirmedValue 为 600 秒
  2. 最新任务 cmd-loc-1154 的目标为 3600 秒
  3. 当前状态为 CANCEL 且 cancelResolution 为 PENDING
- 测试步骤
  1. 打开编辑页记录当前暂时回退展示。
  2. 服务端将 cmd-loc-1154 回写为 SENT。
  3. 刷新编辑页、卡片和指令记录。
  4. 查询任务状态枚举和 confirmedValue。
- 预期结果
  1. 页面可暂时展示确认值 10 分钟，但原目标上下文仍存在。
  2. 回写 SENT 后任务恢复或继续作为有效在途目标。
  3. 编辑页恢复显示 1 小时“设置中”，卡片仍显示确认值 10 分钟，记录状态为 SENT。
  4. 任务状态始终属于 SENDING、SENT、FAILURE、CANCEL 四态，confirmedValue 在可靠成功反馈前保持 600 秒。

## [P3][反向] 验证绕过客户端的非法频率参数形成 FAILURE 且不替换有效目标
- 测试类型
  - 安全性
- 前置条件
  1. 设备 GT-LOC-1155 的 confirmedValue 为 600 秒，当前有效 desiredValue 为 1800 秒且状态 SENT
  2. 使用有效账号和关系绕过客户端校验，准备提交参数 0 秒和 86460 秒
- 测试步骤
  1. 直接向服务端提交参数 0 秒的频率请求。
  2. 使用新的幂等键提交参数 86460 秒的频率请求。
  3. 查询两条记录、分层值和编辑页展示。
- 预期结果
  1. 参数 0 秒请求到达服务端后被参数校验拒绝并形成 FAILURE 记录，不进入执行队列。
  2. 参数 86460 秒同样形成独立 FAILURE 记录，不被截断或归一为 1440 分钟。
  3. 原 desiredValue 仍为 1800 秒并显示 30 分钟“设置中”，confirmedValue 保持 600 秒，两条失败记录保留各自原因。

## [P3][反向] 验证路由校验失败形成 FAILURE 且不修改确认值
- 测试类型
  - 可靠性
- 前置条件
  1. 设备 GT-LOC-1156 的 confirmedValue 为 3600 秒，当前无有效在途目标
  2. 当前账号关系和参数合法，但服务端无法为该设备解析有效下发路由
  3. 待提交频率为 600 秒，幂等键为 idem-loc-1156-route-01
- 测试步骤
  1. 在编辑页选择 10 分钟并点击整页 Save。
  2. 等待服务端完成关系、参数和路由校验。
  3. 查询指令记录、desiredValue、processingValue 和 confirmedValue。
  4. 重新进入编辑页和查看设备卡片。
- 预期结果
  1. 客户端正常提交合法目标，不在本地伪造路由结果。
  2. 请求在服务端路由校验阶段失败并创建 600 秒的 FAILURE 记录，原因明确指向路由不可用。
  3. 不生成有效 desiredValue 或 processingValue，confirmedValue 仍为 3600 秒。
  4. 编辑页和卡片继续展示确认值 1 小时，不显示失败目标为“设置中”或已生效。
