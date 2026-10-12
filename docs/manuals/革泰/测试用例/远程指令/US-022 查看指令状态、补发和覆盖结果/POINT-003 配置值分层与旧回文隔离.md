# 用户故事：US-022 查看指令状态、补发和覆盖结果 - POINT-003 配置值分层与旧回文隔离

## [P1] 验证提交新UPLOAD值不直接覆盖设备确认值
- 测试类型
  - 功能
- 前置条件
  1. 设备GT-D-220301的confirmedValue为600秒，当前无未完成UPLOAD任务
  2. 当前账号与设备关系有效，设备离线且S10U路由合法
- 测试步骤
  1. 提交UPLOAD 3600秒并查询生成的commandId CMD-2203-001
  2. 查询设备配置的confirmedValue、desiredValue和processingValue
- 预期结果
  1. CMD-2203-001受理为SENDING，离线状态不构成失败
  2. confirmedValue保持600秒，desiredValue为3600秒，processingValue为3600秒，最新目标不冒充已确认值

## [P1] 验证连续提交配置值时最新目标与当前处理值分层
- 测试类型
  - 功能
- 前置条件
  1. 设备GT-D-220302的confirmedValue为60秒
  2. 同一设备依次受理UPLOAD 600秒、3600秒、120秒，对应CMD-2203-002-A、CMD-2203-002-B、CMD-2203-002-C
- 测试步骤
  1. 在CMD-2203-002-A处于当前处理位置时查询三个任务及配置值
  2. 查询每条任务保存的desiredValue和configSequence
- 预期结果
  1. confirmedValue为60秒，processingValue为600秒，设备级desiredValue为最新提交的120秒
  2. 三条任务分别保留600秒、3600秒、120秒及递增configSequence，不因最新目标变化改写旧任务参数

## [P2] 验证前序匹配成功回文只更新可靠确认值而不覆盖最新目标
- 测试类型
  - 功能
- 前置条件
  1. 设备GT-D-220303依次存在UPLOAD任务CMD-2203-003-A参数600秒和CMD-2203-003-B参数60秒
  2. 当前desiredValue为60秒，CMD-2203-003-A对应businessId为BIZ-2203-003-A
- 测试步骤
  1. 接收BIZ-2203-003-A的匹配成功回文，反馈值为600秒
  2. 查询两个任务的反馈字段及设备配置分层值
- 预期结果
  1. 成功回文关联到CMD-2203-003-A并写入其feedbackText和feedbackTime
  2. confirmedValue可更新为已可靠确认的600秒，但desiredValue仍为60秒，CMD-2203-003-B的目标不被前序回文覆盖

## [P3][反向] 验证旧UPLOAD回文晚到时不得覆盖更新的目标和确认结果
- 测试类型
  - 可靠性
- 前置条件
  1. CMD-2203-004-A参数600秒、attemptId ATT-2203-004-A、businessId BIZ-2203-004-A
  2. 后续CMD-2203-004-B参数60秒已收到匹配成功回文，设备confirmedValue和desiredValue均为60秒
- 测试步骤
  1. 延迟发送BIZ-2203-004-A的成功回文“UPLOAD=600 OK”
  2. 查询两条记录的反馈字段及设备confirmedValue、desiredValue
- 预期结果
  1. 晚到回文只归入CMD-2203-004-A的审计和反馈字段，不串入CMD-2203-004-B
  2. confirmedValue和desiredValue均保持60秒，不被旧attempt的600秒回文回退

## [P3][反向] 验证无法可靠关联的配置回文只展示不更新确认值
- 测试类型
  - 可靠性
- 前置条件
  1. 设备GT-D-220305的confirmedValue为600秒，desiredValue为3600秒
  2. 收到回文“UPLOAD=120 OK”，但businessId BIZ-UNKNOWN-220305无法映射到任何attemptId
- 测试步骤
  1. 将BIZ-UNKNOWN-220305回文提交到反馈处理链路
  2. 查询异常回文审计和设备配置分层值
- 预期结果
  1. 系统保留回文原文、接收时间及无法关联标记，不伪造commandId或attemptId映射
  2. confirmedValue保持600秒且desiredValue保持3600秒，无法可靠关联的回文不更新配置确认值

## [P3][反向] 验证配置任务失败后不会把目标值误写为确认值
- 测试类型
  - 功能
- 前置条件
  1. 设备GT-D-220306的confirmedValue为600秒
  2. UPLOAD任务CMD-2203-006参数3600秒处于SENDING，desiredValue和processingValue均为3600秒
  3. 设备关系失效导致CMD-2203-006即将转为FAILURE
- 测试步骤
  1. 完成关系失效清理并查询CMD-2203-006
  2. 查询设备confirmedValue、desiredValue和processingValue的收敛结果
- 预期结果
  1. CMD-2203-006转为FAILURE且未产生成功反馈，发送时间为“—”
  2. confirmedValue保持600秒；系统按剩余有效任务重新计算目标和处理中值，不得把失败的3600秒写成已确认值
