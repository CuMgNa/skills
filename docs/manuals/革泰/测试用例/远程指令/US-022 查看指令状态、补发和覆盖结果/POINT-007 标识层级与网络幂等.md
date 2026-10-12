# 用户故事：US-022 查看指令状态、补发和覆盖结果 - POINT-007 标识层级与网络幂等

## [P1] 验证首次单设备下发建立完整且可追溯的标识层级
- 测试类型
  - 可维护性
- 前置条件
  1. 当前账号GT-P-2207对设备GT-D-220701提交CR
  2. 客户端生成operationId OP-2207-001和idempotencyKey IDEM-2207-001
- 测试步骤
  1. 完成首次提交并查询服务端创建的commandId、attemptId和businessId
  2. 按businessId反查attemptId、commandId、operationId和deviceId
- 预期结果
  1. 系统创建一条commandId记录和一个首次attemptId，S10U为该attempt分配唯一businessId
  2. 可从businessId唯一追溯到同一attemptId、commandId、OP-2207-001和GT-D-220701，不存在一对多歧义

## [P1] 验证网络超时安全重试复用同一attempt和幂等标识
- 测试类型
  - 可靠性
- 前置条件
  1. UPLOAD 600秒请求OP-2207-002首次调用已被服务端受理，但客户端在响应返回前超时
  2. 首次调用使用requestId REQ-2207-002和idempotencyKey IDEM-2207-002
- 测试步骤
  1. 使用REQ-2207-002和IDEM-2207-002重试原请求
  2. 查询该操作关联的commandId、attemptId、businessId和队列任务数
- 预期结果
  1. 重试返回原操作的实际受理结果，不创建新的用户意图
  2. 同一operationId下仅有一个commandId、一个attemptId、一个businessId和一条队列任务

## [P3][反向] 验证同批次同设备重复明细仅受理一次
- 测试类型
  - 可靠性
- 前置条件
  1. 批次BATCH-2207-003目标数组包含GT-D-220703两次和GT-D-220704一次
  2. 两台设备均具有合法关系、路由和VERNO能力
- 测试步骤
  1. 使用operationId OP-2207-003提交批量VERNO
  2. 查询batchId下的去重设备明细、commandId、attemptId和任务数
- 预期结果
  1. 服务端按deviceId去重，最终目标设备数为2
  2. GT-D-220703和GT-D-220704各有且仅有一条明细、一个首次attempt和一条任务，不因重复输入受理两次

## [P2] 验证批量内不同设备共享批次但保持独立任务标识
- 测试类型
  - 可维护性
- 前置条件
  1. 批次BATCH-2207-004包含GT-D-220705、GT-D-220706、GT-D-220707三台设备
  2. 三台设备均提交ZONE UTC+08:00
- 测试步骤
  1. 查询三台设备明细的batchId、deviceId、commandId、attemptId和businessId
  2. 分别按三个businessId回查所属设备和记录
- 预期结果
  1. 三条明细共享BATCH-2207-004，但各自具有唯一commandId、attemptId和businessId
  2. 每个businessId只回查到对应deviceId的attempt和command，不发生跨设备回文串扰

## [P3][反向] 验证结果未知期间查询原操作不创建第二条任务
- 测试类型
  - 可靠性
- 前置条件
  1. RESET操作OP-2207-005提交后客户端收到结果未知，原requestId为REQ-2207-005
  2. 服务端实际已为GT-D-220708创建CMD-2207-005和ATT-2207-005
- 测试步骤
  1. 使用OP-2207-005和REQ-2207-005查询原操作
  2. 在查询返回前再次发起同标识的安全查询
  3. 查询GT-D-220708关联的任务和用户可见记录数量
- 预期结果
  1. 查询返回CMD-2207-005和ATT-2207-005的真实状态
  2. 重复安全查询被幂等处理，不创建新的attempt
  3. 设备关联任务数和用户可见记录数均为1

## [P3][反向] 验证重复状态与回文回调按businessId幂等处理
- 测试类型
  - 可靠性
- 前置条件
  1. ATT-2207-006对应businessId BIZ-2207-006和commandId CMD-2207-006
  2. 状态回调CB-STATE-2207-006与回文回调CB-FEEDBACK-2207-006均已成功处理一次
- 测试步骤
  1. 将CB-STATE-2207-006重复投递三次
  2. 将CB-FEEDBACK-2207-006重复投递三次
  3. 查询状态历史、feedbackText、feedbackTime、统计和通知
- 预期结果
  1. 重复状态回调不重复迁移状态或累计统计
  2. 重复回文仍只关联ATT-2207-006和CMD-2207-006一次
  3. feedbackText和feedbackTime不生成重复版本，通知和配置副作用最多执行一次
