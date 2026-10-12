# US-015 筛选设备并打开快捷操作

> 口径依据：唯一业务真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 1.1～1.4、3.3、8～10 章。二级获得的是分配关系；二级自行移除或一级回收二级时，只清理该二级及其三级分支，一级、其他二级分支和个人链保持有效。

## [P1] 验证企业二级在 APP 移除设备仅级联本分支
- 测试类型
  - 功能
- 前置条件
  1. enterprise_l1_0720 绑定 GT-DEV-0720，并分配给 enterprise_l2_0720a、enterprise_l2_0720b
  2. enterprise_l2_0720a 已分配给 enterprise_l3_0720a1、enterprise_l3_0720a2，enterprise_l2_0720b 已分配给 enterprise_l3_0720b1
  3. personal_0720 独立绑定 GT-DEV-0720
  4. A 分支分组「二级 A 运输组」、围栏「二级 A 围栏」关联 GT-DEV-0720；B 分支分组「二级 B 运输组」、围栏「二级 B 围栏」也关联该设备
  5. GT-DEV-0720 存在设备主数据、库存、物联网卡 ICCID 8986040720000000020 和历史告警 ALM-0720
- 测试步骤
  1. enterprise_l2_0720a 在 APP 设备卡片更多中执行 Unbind Device。
  2. 刷新 enterprise_l1_0720、两个二级和三个三级的 APP 与 Web 列表。
  3. 刷新 personal_0720 的 APP 与 Web 列表。
  4. 查询「二级 A 运输组」「二级 A 围栏」「二级 B 运输组」「二级 B 围栏」的设备关系。
  5. 查询设备主数据、库存、物联网卡和 ALM-0720。
- 预期结果
  1. 动作按二级分配关系移除处理，不解除 enterprise_l1_0720 的直接绑定。
  2. enterprise_l2_0720a、enterprise_l3_0720a1、enterprise_l3_0720a2 不再可见；enterprise_l1_0720、enterprise_l2_0720b、enterprise_l3_0720b1 继续可见。
  3. personal_0720 继续可见 GT-DEV-0720，个人链不受影响。
  4. 「二级 A 运输组」和「二级 A 围栏」关联被清除；「二级 B 运输组」和「二级 B 围栏」仍关联 GT-DEV-0720。
  5. 设备主数据、库存、ICCID 8986040720000000020 和 ALM-0720 均保留。

## [P1] 验证一级回收二级后原子释放测试配额并可分配另一设备
- 测试类型
  - 可靠性
- 前置条件
  1. enterprise_l1_0721 绑定并可见 GT-DEV-0721、GT-DEV-1721，GT-DEV-0721 已分配给 enterprise_l2_0721a、enterprise_l2_0721b
  2. enterprise_l2_0721a 已分配给 enterprise_l3_0721a1，enterprise_l2_0721b 已分配给 enterprise_l3_0721b1
  3. 为本用例将 enterprise_l2_0721a 的测试配置设为 allocationQuota=1、visibleDeviceLimit=1；该值仅为测试配置，不代表产品固定上限，当前名额被 GT-DEV-0721 占满
  4. enterprise_l2_0721a 已存在精确名称为「我的分组」的真实一级分组
  5. GT-DEV-0721 存在设备主数据、库存、物联网卡 ICCID 8986040721000000021 和历史轨迹 TRAJ-0721
- 测试步骤
  1. enterprise_l1_0721 尝试向 enterprise_l2_0721a 分配 GT-DEV-1721。
  2. enterprise_l1_0721 在 Web 用户管理中移除 enterprise_l2_0721a 的 GT-DEV-0721。
  3. 在同一提交结果中查询 enterprise_l2_0721a 的分配关系、allocationQuota 和 visibleDeviceLimit 占用数。
  4. enterprise_l1_0721 使用「仅分配设备」模式，选择目标账号 enterprise_l2_0721a 后分配 GT-DEV-1721；父级界面不查看或选择下级 groupId。
  5. 刷新 A、B 分支列表并查询 GT-DEV-0721 的设备资产与历史数据。
- 预期结果
  1. 因测试配置名额已满，分配失败并展示可读原因及失败字段或失败态，不编造未定义精确文案。
  2. enterprise_l2_0721a、enterprise_l3_0721a1 对 GT-DEV-0721 的关系失效；enterprise_l1_0721、enterprise_l2_0721b、enterprise_l3_0721b1 继续可见。
  3. GT-DEV-0721 关系删除与两个名额占用从 1 释放为 0 在同一提交状态中生效，不出现关系已删但名额仍占用。
  4. GT-DEV-1721 分配成功；系统自动复用 enterprise_l2_0721a 下精确名称为「我的分组」的真实一级分组承接设备，两个名额占用恢复为 1。
  5. B 分支关系保持有效；GT-DEV-0721 的设备主数据、库存、ICCID 8986040721000000021 和 TRAJ-0721 均保留。

## [P1] 验证二级重新获分配采用仅分配设备并进入我的分组
- 测试类型
  - 可靠性
- 前置条件
  1. enterprise_l2_0722 曾获分配 GT-DEV-0722，并继续分配给 enterprise_l3_0722
  2. enterprise_l2_0722 和 enterprise_l3_0722 曾分别关联旧分组「二级冷链组」「三级冷链组」及旧围栏「二级冷库围栏」「三级冷库围栏」
  3. enterprise_l2_0722 已移除自己的设备，当前二级与三级关系及旧业务关联均失效
  4. enterprise_l2_0722 当前不存在精确名称为「我的分组」的真实分组，enterprise_l1_0722 仍绑定并可见 GT-DEV-0722
  5. GT-DEV-0722 存在设备主数据、库存、物联网卡 ICCID 8986040722000000022 和历史告警 ALM-0722
- 测试步骤
  1. enterprise_l1_0722 在 Web 选择「仅分配设备」模式和目标账号 enterprise_l2_0722 后分配 GT-DEV-0722；父级界面不查看或选择下级 groupId。
  2. 刷新 enterprise_l2_0722 的 APP 与 Web 列表并查询「我的分组」。
  3. 刷新 enterprise_l3_0722 的 APP 与 Web 列表。
  4. 查询旧分组「二级冷链组」「三级冷链组」和两个旧围栏的设备关联。
  5. 查询设备主数据、库存、物联网卡和 ALM-0722。
- 预期结果
  1. 重新建立 enterprise_l2_0722 的分配关系，未采用同步覆盖分组模式。
  2. enterprise_l2_0722 恢复可见 GT-DEV-0722；系统自动创建精确名称为「我的分组」的普通真实一级分组并将设备放入该组。
  3. enterprise_l3_0722 默认仍不可见，需由二级重新分配。
  4. 「二级冷链组」「三级冷链组」「二级冷库围栏」「三级冷库围栏」均不自动恢复设备关联。
  5. 设备主数据、库存、ICCID 8986040722000000022 和 ALM-0722 均保留。

## [P1] 验证企业二级在 Web 设备管理移除与 APP 结果一致
- 测试类型
  - 兼容性
- 前置条件
  1. enterprise_l1_0724 绑定 GT-DEV-0724，并分配给 enterprise_l2_0724a、enterprise_l2_0724b
  2. enterprise_l2_0724a 已分配给 enterprise_l3_0724a，enterprise_l2_0724b 已分配给 enterprise_l3_0724b
  3. personal_0724 独立绑定 GT-DEV-0724
  4. GT-DEV-0724 存在设备主数据、库存、物联网卡 ICCID 8986040724000000024 和历史位置 POS-0724
- 测试步骤
  1. enterprise_l2_0724a 在 Web 设备管理中移除 GT-DEV-0724。
  2. 刷新 A 分支的 Web 与 APP 设备列表。
  3. 刷新一级、B 分支和 personal_0724 的设备列表。
  4. 查询 A 分支分配、分组和围栏关系。
  5. 查询设备主数据、库存、物联网卡和 POS-0724。
- 预期结果
  1. Web 按二级分配关系移除处理，与 APP 二级自移除采用同一级联边界。
  2. enterprise_l2_0724a、enterprise_l3_0724a 在 Web 与 APP 均不再可见 GT-DEV-0724。
  3. enterprise_l1_0724、enterprise_l2_0724b、enterprise_l3_0724b、personal_0724 继续可见。
  4. 仅 A 分支分配、分组和围栏关系失效。
  5. 设备主数据、库存、ICCID 8986040724000000024 和 POS-0724 均保留。

## [P3][反向] 验证一级不能通过用户管理移除非直属二级的设备
- 测试类型
  - 安全性
- 前置条件
  1. enterprise_l1_0723a 绑定 GT-DEV-0723，并分配给直属 enterprise_l2_0723a
  2. enterprise_l2_0723b 直属于 enterprise_l1_0723b，与 enterprise_l1_0723a 不存在父子关系
  3. enterprise_l2_0723a 当前可见 GT-DEV-0723
- 测试步骤
  1. enterprise_l1_0723b 在 Web 用户管理中构造移除 enterprise_l2_0723a 的 GT-DEV-0723 请求。
  2. 查看请求返回和操作状态。
  3. 刷新 enterprise_l1_0723a 与 enterprise_l2_0723a 的设备列表。
  4. 查询 GT-DEV-0723 的一级绑定、二级分配、分组和围栏关系。
- 预期结果
  1. 服务端按直属父子关系和设备关系鉴权并拒绝操作。
  2. 展示可读失败原因，并提供失败字段或失败态，不编造未定义精确文案。
  3. enterprise_l1_0723a 与 enterprise_l2_0723a 仍可见 GT-DEV-0723。
  4. 原绑定、分配、分组和围栏关系保持不变，不扩大级联范围。
