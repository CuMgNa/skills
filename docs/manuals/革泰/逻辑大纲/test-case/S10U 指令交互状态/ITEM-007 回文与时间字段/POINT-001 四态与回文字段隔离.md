# 用户故事

## [P1] 验证SENT任务收到业务回文仅更新反馈字段
- 测试类型
  - 功能
- 前置条件
  1. CMD-20261015-070状态为SENT且sentAt为2026-10-15 10:00:00
  2. feedbackText和feedbackTime初始为空
- 测试步骤
  1. 设备返回业务文本VERNO:1.2.3，时间2026-10-15 10:00:05
  2. 查询记录状态与反馈字段
- 预期结果
  1. 记录发送状态仍为SENT，不新增ACKED或COMPLETED
  2. feedbackText更新为VERNO:1.2.3，feedbackTime更新为2026-10-15 10:00:05，sentAt保持不变

## [P1] 验证已写出无回文时保持SENT且反馈为空
- 测试类型
  - 功能
- 前置条件
  1. ATT-20261015-071-A1已完成TCP写出
  2. 设备在观察窗口内未返回业务文本
- 测试步骤
  1. 查询指令记录
  2. 检查状态枚举和反馈字段
- 预期结果
  1. 记录为SENT，表示仅完成TCP写出，不宣称设备执行成功
  2. feedbackText和feedbackTime均为空，状态不变为TIMEOUT

## [P3][反向] 验证设备业务失败回文不改写发送FAILURE
- 测试类型
  - 功能
- 前置条件
  1. CMD-20261015-072已SENT
  2. 设备返回业务文本ERROR:PARAM_REJECTED
- 测试步骤
  1. 写入回文及feedbackTime 2026-10-15 10:10:05
  2. 查询发送状态和失败时间
- 预期结果
  1. feedbackText保存ERROR:PARAM_REJECTED并可作为业务失败反馈展示
  2. 发送状态仍为SENT，failedAt为空且不得改写为FAILURE

## [P3][反向] 验证SENDING和真正CANCEL任务无回文时反馈为空
- 测试类型
  - 功能
- 前置条件
  1. CMD-20261015-073为尚未写出的SENDING任务
  2. CMD-20261015-074为cancelResolution CONFIRMED的CANCEL任务
- 测试步骤
  1. 查询两条记录的反馈字段
  2. 检查页面状态文案
- 预期结果
  1. 两条记录的feedbackText和feedbackTime均为空
  2. 页面分别展示等待发送和已取消，不伪造设备回复或新增状态
