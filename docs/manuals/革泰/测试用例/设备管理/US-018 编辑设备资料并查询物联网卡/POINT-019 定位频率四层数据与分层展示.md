# US-018 编辑设备资料并查询物联网卡
> 口径依据：唯一业务需求真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 5.4、5.9、8、10 节。页面遵循 localEditValue 高于 desiredValue、desiredValue 高于 confirmedValue 的优先级；processingValue 仅用于服务端顺序控制；设备卡片只展示确认值，编辑页展示最新有效目标，详情抽屉不展示定位频率。

## [P1] 验证设备卡片始终只展示 confirmedValue
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1111 的 confirmedValue 为 600 秒
  2. 最新 desiredValue 为 3600 秒且状态为 SENDING
  3. processingValue 为 60 秒
- 测试步骤
  1. 打开设备列表并定位 GT-LOC-1111 卡片。
  2. 打开该设备独立编辑页。
  3. 核对卡片、编辑页与服务端四层数据。
- 预期结果
  1. 卡片显示“10分钟定位（默认模式）”，不显示未确认的 60 分钟目标或 1 分钟处理值。
  2. 编辑页显示“1 小时（省电模式）”并标记“设置中”。
  3. 服务端保留 confirmedValue 600 秒、desiredValue 3600 秒、processingValue 60 秒，页面不得把处理值或目标值冒充已生效值。

## [P1] 验证编辑页按 localEditValue 优先展示本次未保存选择
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1112 的 confirmedValue 为 600 秒
  2. 最新 desiredValue 为 3600 秒且状态为 SENT
  3. 编辑页已显示“1 小时（省电模式）”“设置中”
- 测试步骤
  1. 打开频率选择层并选择自定义 37 分钟。
  2. 点击选择层确认，但不点击整页 Save。
  3. 核对编辑页主展示、设备卡片和指令记录。
  4. 点击返回取消本次编辑后重新进入编辑页。
- 预期结果
  1. 本地形成 localEditValue 2220 秒。
  2. 编辑页优先显示“自定义模式（37 分钟）”，该值尚未成为服务端目标。
  3. 卡片仍显示确认值 10 分钟，指令记录未新增 37 分钟任务。
  4. localEditValue 被丢弃，重新进入后恢复显示 1 小时目标并标记“设置中”。

## [P2] 验证无确认值和无有效目标时各页面使用空态口径
- 测试类型
  - 易用性
- 前置条件
  1. 设备 GT-LOC-1113 的 confirmedValue、desiredValue、processingValue 均为空
  2. 当前编辑会话尚未选择频率
- 测试步骤
  1. 查看 GT-LOC-1113 设备卡片。
  2. 打开设备详情抽屉。
  3. 进入独立编辑页并查看 Location Interval。
  4. 不做选择直接返回。
- 预期结果
  1. 设备卡片隐藏定位频率，不显示 0、空白占位或默认 10 分钟。
  2. 详情抽屉不出现定位频率字段。
  3. 编辑页显示“请选择定位频率”，不自动预选“10 分钟（默认模式）”。
  4. 返回不创建 UPLOAD，不改变三层服务端数据。

## [P2] 验证指令记录展示业务明细而内部标识仅通过接口日志核对
- 测试类型
  - 功能
- 前置条件
  1. 设备 GT-LOC-1114 存在频率任务 commandId cmd-loc-1114、attemptId att-loc-1114-01、configSequence 18
  2. 任务参数为 2220 秒，状态为 FAILURE，反馈为“下发失败”，失败原因为“设备型号不支持 UPLOAD”，记录时间为 2026-10-12 11:14:00
- 测试步骤
  1. 打开 GT-LOC-1114 详情抽屉并检查字段。
  2. 进入独立编辑页检查当前展示。
  3. 从指令记录入口查看该条失败记录的页面明细。
  4. 通过指令查询接口和服务端日志核对 commandId、attemptId 与 configSequence。
- 预期结果
  1. 详情抽屉不展示定位频率、任务状态或任务参数。
  2. 编辑页按剩余有效目标或 confirmedValue 回退，不把 FAILURE 参数继续标记为“设置中”。
  3. 指令记录页面展示参数 2220 秒、FAILURE、时间 2026-10-12 11:14:00、反馈“下发失败”和失败原因“设备型号不支持 UPLOAD”，不要求 UI 展示 commandId、attemptId 或 configSequence。
  4. 接口与日志中的 commandId 为 cmd-loc-1114、最新 attemptId 为 att-loc-1114-01、configSequence 为 18，内部标识与页面所示业务记录可靠关联。
