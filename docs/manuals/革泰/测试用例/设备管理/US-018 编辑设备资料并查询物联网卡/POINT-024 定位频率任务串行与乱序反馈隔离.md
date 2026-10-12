# US-018 编辑设备资料并查询物联网卡
> 口径依据：唯一业务需求真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 5.4、5.7、5.9、10 节。同一设备所有频率任务按 configSequence 串行执行，commandId 标识任务、attemptId 标识尝试、businessId 与 attemptId 一一映射；旧任务反馈不得覆盖更新目标。

## [P1] 验证多条频率任务按 configSequence 串行执行
- 测试类型
  - 可靠性
- 前置条件
  1. 当前账号可编辑设备 GT-LOC-1141
  2. 普通队列当前为空，可观察任务开始时间和写出时间
- 测试步骤
  1. 依次提交 1 分钟、10 分钟、60 分钟三个保存意图。
  2. 查询三条任务的 commandId 和 configSequence。
  3. 保持首条任务未结束并观察后两条是否写出。
  4. 依次结束队列头任务并观察队列推进。
- 预期结果
  1. 三次保存均被受理并保留为三条独立任务。
  2. 三条任务拥有不同 commandId，configSequence 按提交顺序严格递增。
  3. 首条任务处理期间后两条只排队，不并行写出、不覆盖前序记录。
  4. 每次仅由当前队列头推进到下一条，执行顺序与 configSequence 一致。

## [P1] 验证旧任务成功反馈不得覆盖更新目标
- 测试类型
  - 可靠性
- 前置条件
  1. 设备 GT-LOC-1142 的 confirmedValue 为 600 秒
  2. 旧任务 cmd-loc-1142-a 的目标为 60 秒、configSequence 为 41
  3. 新任务 cmd-loc-1142-b 的目标为 3600 秒、configSequence 为 42，当前为 SENDING
- 测试步骤
  1. 打开编辑页确认最新目标展示。
  2. 注入旧任务 cmd-loc-1142-a 的可靠成功反馈。
  3. 刷新编辑页、设备卡片并查询四层数据。
- 预期结果
  1. 编辑页显示 1 小时目标并标记“设置中”。
  2. 后端可将旧任务已生效值可靠更新为 confirmedValue 60 秒，但不得删除或替换 configSequence 42 的新目标。
  3. 卡片显示最新 confirmedValue 1 分钟；编辑页继续显示新目标 1 小时“设置中”，desiredValue 仍为 3600 秒。

## [P1] 验证目标值与当前处理值独立推进
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1143 的 confirmedValue 为 600 秒
  2. configSequence 51 的 processingValue 为 60 秒且状态 SENT
  3. configSequence 52 的 desiredValue 为 1800 秒且正在排队
- 测试步骤
  1. 查询服务端队列头和最新有效目标。
  2. 打开设备卡片和独立编辑页。
  3. 在 sequence 51 未完成时刷新页面三次。
- 预期结果
  1. processingValue 为 60 秒，desiredValue 为 1800 秒，二者保持独立。
  2. 卡片显示确认值 10 分钟；编辑页显示自定义 30 分钟并标记“设置中”。
  3. 页面刷新不得改为显示 processingValue 1 分钟，也不得提前并行处理 sequence 52。

## [P1] 验证重发沿用 commandId并创建新的尝试映射
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1144 存在 FAILURE 任务 commandId cmd-loc-1144
  2. 首次 attemptId 为 att-loc-1144-01，对应 businessId biz-loc-1144-01
  3. 失败任务参数为 1200 秒
- 测试步骤
  1. 从指令记录页对 cmd-loc-1144 执行重新发送。
  2. 查询任务的 commandId、最新 attemptId、businessId 和 configSequence。
  3. 注入新 businessId 的成功反馈并核对关联结果。
- 预期结果
  1. 重发不创建新的 commandId，仍归属于 cmd-loc-1144。
  2. 创建 att-loc-1144-02 和 biz-loc-1144-02，二者一一映射，并作为新的有效目标进入队列。
  3. 后端按 businessId biz-loc-1144-02 定位 attemptId att-loc-1144-02，再关联 commandId cmd-loc-1144，成功反馈只作用于正确尝试。

## [P1] 验证四个入口共用同一设备 configSequence 并跨入口串行
- 测试类型
  - 可靠性
- 前置条件
  1. 账号 GT-E1-1145 对设备 GT-LOC-1145 具备独立编辑页、More → Send Command、批量下发和指令记录页重发的既有入口权限
  2. 已按各指令专项的入口能力准备四份合法夹具，均作用于 GT-LOC-1145；批量夹具中该设备仅出现一次，本用例不扩写具体指令参数
  3. 指令记录中存在按既有规则具备重发入口的 FAILURE 记录 cmd-loc-1145-r，设备普通队列为空且可观察 commandId、attemptId、businessId、configSequence 和实际写出顺序
- 测试步骤
  1. 从独立编辑页提交夹具 A，记录首次受理任务及其 configSequence。
  2. 在夹具 A 未结束时，从 More → Send Command 提交夹具 B，再从批量入口提交包含 GT-LOC-1145 的夹具 C。
  3. 从指令记录页重发 cmd-loc-1145-r，记录新 attemptId、businessId 及本次进入设备配置队列的顺序位置。
  4. 保持队列头任务未结束，检查后三次操作是否写出；随后按队列头完成顺序逐项推进并核对全部记录。
- 预期结果
  1. 四个入口均进入 GT-LOC-1145 的同一设备配置序列，不按页面或业务入口拆成可并行的独立队列。
  2. 各次受理对应的 configSequence / 队列位置按实际提交顺序递增；夹具 A 未结束时，B、C 和记录页重发尝试只能排队，不得提前写出。
  3. 记录页重发保持 commandId cmd-loc-1145-r，创建新的 attemptId 及与其一一映射的 businessId，并按本次入队顺序参与串行处理，不因复用 commandId 绕过前序任务。
  4. 实际写出顺序与共享 configSequence 一致，无跨入口并行、插队、覆盖前序目标或重复记录；各入口原记录均可追踪。

## [P1] 验证记录页重发后编辑页展示重发目标设置中
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1146 的 confirmedValue 为 600 秒
  2. FAILURE 记录 commandId=cmd-loc-1146 的参数为 1200 秒，当前无其他有效目标
  3. 该记录具备重新发送入口
- 测试步骤
  1. 从指令记录页对 cmd-loc-1146 执行重新发送。
  2. 查询新 attemptId、businessId、configSequence 和任务状态。
  3. 返回并打开设备独立编辑页。
  4. 核对设备卡片和编辑页展示。
- 预期结果
  1. 重发保持 commandId=cmd-loc-1146，并创建新的 attemptId 与一一映射的 businessId。
  2. 新尝试作为参数 1200 秒的有效目标进入 SENDING 或 SENT，并取得新的队列顺序。
  3. 编辑页展示自定义 20 分钟并标记“设置中”，不继续停留在失败前的旧页面状态。
  4. 设备卡片仍展示 confirmedValue 对应的 10 分钟，可靠成功反馈前不把重发目标冒充已生效值。
