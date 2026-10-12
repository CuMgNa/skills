# US-018 编辑设备资料并查询物联网卡
> 口径依据：唯一业务需求真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 5.4、5.7、5.9 节。任务状态与分层值由服务端持久化，退出页面或重启 APP 后仍可恢复；客户端不得用单个上传间隔字段猜测状态，也不得因本地会话结束丢失在途目标或取消上下文。

## [P1] 验证退出编辑页后重进恢复 SENDING 目标
- 测试类型
  - 稳定性
- 前置条件
  1. 设备 GT-LOC-1171 的 confirmedValue 为 600 秒
  2. 最新任务 cmd-loc-1171 的 desiredValue 为 1800 秒、状态 SENDING、configSequence 为 81
- 测试步骤
  1. 打开编辑页确认当前频率展示。
  2. 退出编辑页并关闭详情抽屉。
  3. 从设备列表重新打开详情抽屉并进入编辑页。
  4. 查询服务端分层值和任务标识。
- 预期结果
  1. 页面显示自定义 30 分钟并标记“设置中”。
  2. 退出只结束本地页面，不取消或删除服务端任务。
  3. 重进后仍显示 30 分钟“设置中”，卡片显示确认值 10 分钟，详情抽屉不展示频率。
  4. desiredValue、cmd-loc-1171 和 configSequence 81 均保持不变。

## [P1] 验证重启 APP 后恢复 SENT 任务及标识链
- 测试类型
  - 稳定性
- 前置条件
  1. 设备 GT-LOC-1172 的 confirmedValue 为 60 秒
  2. 最新任务 commandId 为 cmd-loc-1172、attemptId 为 att-loc-1172-01、businessId 为 biz-loc-1172-01
  3. 任务参数为 3600 秒、状态 SENT、configSequence 为 92，尚无可靠成功反馈
- 测试步骤
  1. 强制结束 APP 进程并重新启动。
  2. 登录原账号并进入 GT-LOC-1172 独立编辑页。
  3. 查询指令记录与服务端任务标识链。
- 预期结果
  1. APP 重启不把 SENT 当成已生效，也不清空服务端目标。
  2. 编辑页显示 1 小时“设置中”，设备卡片显示 confirmedValue 对应的 1 分钟。
  3. commandId cmd-loc-1172、attemptId att-loc-1172-01、businessId biz-loc-1172-01 和 configSequence 92 完整恢复，记录状态仍为 SENT；一个 commandId 可关联多个 attemptId，本次 businessId 与 attemptId 一一映射，不得把三者整体定义为一一关系。

## [P1] 验证取消待定上下文在重启后可被 SENT 回写恢复
- 测试类型
  - 可靠性
- 前置条件
  1. 设备 GT-LOC-1173 的 confirmedValue 为 600 秒
  2. 最新任务 cmd-loc-1173 的目标为 3600 秒
  3. 状态为 CANCEL 且 cancelResolution 为 PENDING
- 测试步骤
  1. 关闭并重启 APP 后进入 GT-LOC-1173 编辑页。
  2. 查询服务端原任务参数与取消处理上下文。
  3. 将 cmd-loc-1173 回写为 SENT并刷新页面。
- 预期结果
  1. 页面可按取消交互显示回退值，但不得据此删除原目标。
  2. 服务端仍保存 cmd-loc-1173、目标 3600 秒及对应 attemptId，具备恢复条件。
  3. 回写 SENT 后编辑页恢复显示 1 小时“设置中”，不新建 commandId，不改变 confirmedValue 600 秒。

## [P3][反向] 验证最终失败或确认取消后重进不恢复无效目标
- 测试类型
  - 可靠性
- 前置条件
  1. 设备 GT-LOC-1174 的 confirmedValue 为 600 秒
  2. sequence 101 的 1800 秒任务仍有效
  3. sequence 102 的 3600 秒任务可分别置为 FAILURE 或 CANCEL 且 cancelResolution 为 CONFIRMED
- 测试步骤
  1. 将 sequence 102 置为 FAILURE，退出并重进编辑页。
  2. 恢复测试数据后将 sequence 102 置为 CANCEL 且取消最终确认，重启 APP 并进入编辑页。
  3. 查询两次恢复后的 desiredValue、confirmedValue 和指令记录。
- 预期结果
  1. FAILURE 后重进不恢复 3600 秒目标，页面回退到 sequence 101 的 30 分钟“设置中”。
  2. 取消最终确认后重启同样不恢复 3600 秒目标，页面展示 sequence 101 的 30 分钟“设置中”。
  3. 两种场景均保留原失败或取消记录，confirmedValue 仍为 600 秒，不得用本地缓存覆盖服务端最终状态。
