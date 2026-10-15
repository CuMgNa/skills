# 用户故事

## [P1] 验证普通五类均按普通队列类受理
- 测试类型
  - 功能
- 前置条件
  1. 账号qa_s10u_admin已登录并拥有测试夹具设备S10U000001的控制权限
  2. 设备S10U000001具备CR、VERNO、FIND、UPLOAD、ZONE能力及合法S10U路由
- 测试步骤
  1. 依次提交CR、VERNO、FIND、UPLOAD、ZONE，分别使用commandId CMD-20261015-001至CMD-20261015-005
  2. 查询五条指令记录及队列任务
- 预期结果
  1. 五次请求均按普通队列类执行服务端校验，不套用高危会话准入条件
  2. 五条记录初始状态均为SENDING，且各有唯一attemptId ATT-20261015-001-A1至ATT-20261015-005-A1

## [P1] 验证RESET和POWEROFF均按高危会话绑定类受理
- 测试类型
  - 功能
- 前置条件
  1. 账号qa_s10u_admin已登录并拥有测试夹具设备S10U000001的控制权限
  2. 设备S10U000001当前可写会话为session-A，sessionEpoch为epoch-101，channelId为channel-01
- 测试步骤
  1. 提交RESET，使用commandId CMD-20261015-006和attemptId ATT-20261015-006-A1
  2. 提交POWEROFF，使用commandId CMD-20261015-007和attemptId ATT-20261015-007-A1
- 预期结果
  1. RESET记录进入SENDING并绑定session-A、epoch-101、channel-01
  2. POWEROFF记录进入SENDING并绑定session-A、epoch-101、channel-01

## [P3][反向] 验证未知指令类型被拒绝且不进入合法四态流转
- 测试类型
  - 功能
- 前置条件
  1. 账号qa_s10u_admin已登录并拥有设备S10U000001控制权限
- 测试步骤
  1. 构造指令类型REBOOTX并提交commandId CMD-20261015-008
  2. 查询CMD-20261015-008的服务端处理结果
- 预期结果
  1. 服务端拒绝未知指令类型REBOOTX，不创建队列任务
  2. 若服务端已识别账号、设备和操作意图，则创建失败记录且状态为FAILURE；不得写入ACKED、TIMEOUT、QUEUED、COMPLETED、REJECTED或EXPIRED

## [P3][反向] 验证缺少合法S10U路由不被伪装为离线排队
- 测试类型
  - 功能
- 前置条件
  1. 账号qa_s10u_admin已登录并拥有设备S10U000002控制权限
  2. 设备S10U000002无合法S10U路由且通信展示为离线
- 测试步骤
  1. 为S10U000002提交CR，使用commandId CMD-20261015-009和attemptId ATT-20261015-009-A1
  2. 查询记录状态、failureStage和failureReason
- 预期结果
  1. 服务端创建CMD-20261015-009失败记录，不创建普通待发队列任务
  2. 记录状态为FAILURE，失败阶段指向路由校验且原因明确为S10U路由缺失，不显示为设备离线
