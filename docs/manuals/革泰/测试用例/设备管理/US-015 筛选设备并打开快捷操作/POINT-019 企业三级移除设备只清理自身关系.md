# US-015 筛选设备并打开快捷操作

> 口径依据：唯一业务真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 1.1～1.4、3.3、8～10 章。三级仅持有直属二级分配关系；三级自行移除或父级回收时，只清理指定三级自身及其分组、围栏关联，不影响一级、二级和同级其他三级。

## [P1] 验证企业三级在 APP 移除设备只影响自身
- 测试类型
  - 功能
- 前置条件
  1. enterprise_l1_0730 绑定 GT-DEV-0730，并分配给 enterprise_l2_0730
  2. enterprise_l2_0730 已分配给 enterprise_l3_0730a、enterprise_l3_0730b
  3. personal_0730 独立绑定 GT-DEV-0730
  4. A 的分组「三级东区组」、围栏「三级东区围栏」关联 GT-DEV-0730；B 的分组「三级西区组」、围栏「三级西区围栏」也关联该设备
  5. GT-DEV-0730 存在设备主数据、库存、物联网卡 ICCID 8986040730000000030 和历史轨迹 TRAJ-0730
- 测试步骤
  1. enterprise_l3_0730a 在 APP 设备卡片更多中执行 Unbind Device。
  2. 刷新一级、二级、两个三级的 APP 与 Web 列表。
  3. 刷新 personal_0730 的 APP 与 Web 列表。
  4. 查询两个三级的分组和围栏关系。
  5. 查询设备主数据、库存、物联网卡和 TRAJ-0730。
- 预期结果
  1. 动作按 enterprise_l3_0730a 的三级分配关系移除处理。
  2. 仅 enterprise_l3_0730a 不再可见；enterprise_l1_0730、enterprise_l2_0730、enterprise_l3_0730b 继续可见。
  3. personal_0730 继续可见 GT-DEV-0730。
  4. 「三级东区组」和「三级东区围栏」关联被清除；「三级西区组」和「三级西区围栏」仍关联 GT-DEV-0730。
  5. 设备主数据、库存、ICCID 8986040730000000030 和 TRAJ-0730 均保留。

## [P1] 验证企业三级在 Web 设备管理移除与 APP 结果一致
- 测试类型
  - 兼容性
- 前置条件
  1. enterprise_l1_0735 绑定 GT-DEV-0735，并分配给 enterprise_l2_0735
  2. enterprise_l2_0735 已分配给 enterprise_l3_0735a、enterprise_l3_0735b
  3. personal_0735 独立绑定 GT-DEV-0735
  4. GT-DEV-0735 存在设备主数据、库存、物联网卡 ICCID 8986040735000000035 和历史告警 ALM-0735
- 测试步骤
  1. enterprise_l3_0735a 在 Web 设备管理中移除 GT-DEV-0735。
  2. 刷新 enterprise_l3_0735a 的 Web 与 APP 设备列表。
  3. 刷新一级、二级、enterprise_l3_0735b 和 personal_0735 的设备列表。
  4. 查询 enterprise_l3_0735a 的分配、分组和围栏关系。
  5. 查询设备主数据、库存、物联网卡和 ALM-0735。
- 预期结果
  1. Web 按三级分配关系移除处理，与 APP 三级自移除采用同一边界。
  2. enterprise_l3_0735a 在 Web 与 APP 均不再可见 GT-DEV-0735。
  3. enterprise_l1_0735、enterprise_l2_0735、enterprise_l3_0735b、personal_0735 继续可见。
  4. 仅 enterprise_l3_0735a 的分配、分组和围栏关系失效。
  5. 设备主数据、库存、ICCID 8986040735000000035 和 ALM-0735 均保留。

## [P1] 验证父级回收三级遵循单账号边界并原子释放测试配额
- 测试类型
  - 可靠性
- 前置条件
  1. enterprise_l1_0731 绑定并可见 GT-DEV-0731、GT-DEV-1731，并分配给 enterprise_l2_0731
  2. enterprise_l2_0731 已将 GT-DEV-0731 分配给 enterprise_l3_0731a、enterprise_l3_0731b
  3. 为本用例将 enterprise_l3_0731a 的测试配置设为 allocationQuota=1、visibleDeviceLimit=1；该值仅为测试配置，不代表产品固定上限，当前名额被 GT-DEV-0731 占满
  4. enterprise_l3_0731a 已存在精确名称为「我的分组」的真实一级分组
  5. enterprise_l1_0732 绑定 GT-DEV-0732，经 enterprise_l2_0732 分配给 enterprise_l3_0732a、enterprise_l3_0732b
  6. GT-DEV-0731、GT-DEV-0732 均存在设备主数据、库存、物联网卡 ICCID 8986040731000000031、8986040732000000032 和历史告警 ALM-0731、ALM-0732
- 测试步骤
  1. enterprise_l2_0731 尝试向 enterprise_l3_0731a 分配 GT-DEV-1731。
  2. enterprise_l2_0731 在 Web 用户管理中移除 enterprise_l3_0731a 的 GT-DEV-0731，并查询关系与两个测试配额占用数；随后选择「仅分配设备」模式和目标账号 enterprise_l3_0731a 分配 GT-DEV-1731，父级界面不查看或选择下级 groupId。
  3. enterprise_l1_0732 在 Web 用户管理中移除 enterprise_l3_0732a 的 GT-DEV-0732。
  4. 刷新两个设备对应的一级、二级和同级三级设备列表。
  5. 查询目标三级与对照三级的分组、围栏，以及两个设备的资产和历史数据。
- 预期结果
  1. 因测试配置名额已满，首次分配失败并展示可读原因及失败字段或失败态，不编造未定义精确文案。
  2. GT-DEV-0731 目标三级关系删除与名额占用从 1 释放为 0 原子生效；GT-DEV-1731 随后分配成功，系统自动复用 enterprise_l3_0731a 下精确名称为「我的分组」的真实一级分组承接设备，名额占用恢复为 1。
  3. GT-DEV-0732 仅 enterprise_l3_0732a 关系失效，enterprise_l2_0732 和 enterprise_l3_0732b 保持有效。
  4. 两条回收路径均不影响一级、二级及同级其他三级的既有可见关系。
  5. 仅目标三级的旧分组和围栏关联被清除；对照三级关系保留，GT-DEV-0731、GT-DEV-0732 的设备主数据、库存、ICCID 8986040731000000031、8986040732000000032、ALM-0731、ALM-0732 均保留。

## [P1] 验证三级重新获分配采用仅分配设备并进入我的分组
- 测试类型
  - 可靠性
- 前置条件
  1. enterprise_l3_0733 曾获分配 GT-DEV-0733，并关联旧分组「三级应急组」和旧围栏「三级应急围栏」
  2. enterprise_l3_0733 已自行移除 GT-DEV-0733，当前关系和旧业务关联均失效
  3. enterprise_l3_0733 当前不存在精确名称为「我的分组」的真实分组，enterprise_l2_0733 仍可见并有权分配 GT-DEV-0733
  4. GT-DEV-0733 存在设备主数据、库存、物联网卡 ICCID 8986040733000000033 和历史位置 POS-0733
- 测试步骤
  1. enterprise_l2_0733 在 Web 选择「仅分配设备」模式和目标账号 enterprise_l3_0733 后分配 GT-DEV-0733；父级界面不查看或选择下级 groupId。
  2. 刷新 enterprise_l3_0733 的 APP 与 Web 列表并查询「我的分组」。
  3. 查询旧分组「三级应急组」的设备成员。
  4. 查询旧围栏「三级应急围栏」的设备关联。
  5. 查询设备主数据、库存、物联网卡和 POS-0733。
- 预期结果
  1. 重新建立 enterprise_l3_0733 的三级分配关系，未采用同步覆盖分组模式。
  2. enterprise_l3_0733 在 APP 与 Web 恢复可见 GT-DEV-0733；系统自动创建精确名称为「我的分组」的普通真实一级分组并将设备放入该组。
  3. GT-DEV-0733 不自动回到旧分组「三级应急组」。
  4. GT-DEV-0733 不自动恢复与旧围栏「三级应急围栏」的关联。
  5. 设备主数据、库存、ICCID 8986040733000000033 和 POS-0733 均保留。

## [P3][反向] 验证非直属二级不能回收其他分支三级设备
- 测试类型
  - 安全性
- 前置条件
  1. enterprise_l2_0734a 已向直属 enterprise_l3_0734a 分配 GT-DEV-0734
  2. enterprise_l2_0734b 与 enterprise_l3_0734a 不存在直属父子关系
  3. enterprise_l3_0734a 当前可见 GT-DEV-0734
- 测试步骤
  1. enterprise_l2_0734b 构造移除 enterprise_l3_0734a 的 GT-DEV-0734 请求。
  2. 查看请求返回和失败状态。
  3. 刷新 enterprise_l2_0734a 与 enterprise_l3_0734a 的设备列表。
  4. 查询 GT-DEV-0734 的二级、三级、分组和围栏关系。
- 预期结果
  1. 服务端拒绝非直属父级的回收请求。
  2. 展示可读失败原因，并提供失败字段或失败态，不编造未定义精确文案。
  3. enterprise_l2_0734a 与 enterprise_l3_0734a 仍可见 GT-DEV-0734。
  4. 原关系保持不变，失败操作不影响目标三级或其他账号。

## [P1] 验证企业一级从用户管理移除指定三级仅清理该三级关系
- 测试类型
  - 功能
- 前置条件
  1. 企业一级账号 enterprise_l1_0736 直接绑定 GT-DEV-0736，并分配给直属二级 enterprise_l2_0736
  2. enterprise_l2_0736 已将 GT-DEV-0736 分配给直属三级 enterprise_l3_0736a、enterprise_l3_0736b
  3. enterprise_l3_0736a 的分组「三级 A 组」和围栏「三级 A 围栏」关联 GT-DEV-0736；enterprise_l3_0736b 存在独立分组和围栏关联
  4. enterprise_l1_0736 可在 Web 用户管理路径查看 enterprise_l2_0736 对应的三级账号设备
- 测试步骤
  1. enterprise_l1_0736 在 Web 用户管理中定位 enterprise_l3_0736a，并移除其 GT-DEV-0736。
  2. 刷新 enterprise_l1_0736、enterprise_l2_0736、enterprise_l3_0736a、enterprise_l3_0736b 的 APP 与 Web 设备列表。
  3. 查询四个账号的绑定或分配关系。
  4. 查询两个三级账号的分组和围栏关联。
- 预期结果
  1. 操作按一级经用户管理回收指定三级分配关系处理，不移除二级分配关系。
  2. enterprise_l1_0736、enterprise_l2_0736、enterprise_l3_0736b 继续可见 GT-DEV-0736，仅 enterprise_l3_0736a 不再可见。
  3. 企业一级绑定、二级分配和 enterprise_l3_0736b 的三级分配关系保持有效，仅目标三级关系删除。
  4. 仅「三级 A 组」和「三级 A 围栏」中的设备关联被清除，同级其他三级的分组与围栏不受影响。
