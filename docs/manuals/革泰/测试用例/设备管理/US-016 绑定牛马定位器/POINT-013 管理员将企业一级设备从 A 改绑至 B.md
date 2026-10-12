# US-016 绑定牛马定位器

> 口径依据：唯一业务真源《革泰 APP 设备管理逻辑点梳理 plan.md》第 1.1～1.4、3.3、8～10 章。后台改绑企业一级 A→B 等价于解绑 A 加绑定 B；A 链全部失效，B 下级不自动获得设备，个人绑定和历史数据保留，原分组、围栏不迁移也不恢复。

## [P1] 验证管理员改绑 A 到 B 等价于解绑 A 加绑定 B
- 测试类型
  - 功能
- 前置条件
  1. 企业一级 enterprise_l1_a_0740 绑定 GT-DEV-0740，并逐级分配给 enterprise_l2_a_0740、enterprise_l3_a_0740
  2. enterprise_l1_b_0740 是有效企业一级账号，已有直属 enterprise_l2_b_0740、enterprise_l3_b_0740，但未直接绑定或获分配 GT-DEV-0740
  3. GT-DEV-0740 已在管理后台入库且设备类型为当前入口支持的牛马定位器，不存在 enterprise_l1_b_0740 的重复绑定
  4. GT-DEV-0740 的企业一级槽位在解除 A 后可供 B 使用，enterprise_l1_b_0740 至少剩余 1 个 bindingQuota
  5. personal_0740 独立绑定 GT-DEV-0740
  6. GT-DEV-0740 存在设备主数据、库存、物联网卡 ICCID 8986040740000000040、历史位置 POS-0740 和告警 ALM-0740
- 测试步骤
  1. 后台管理员 admin_0740 将 GT-DEV-0740 从 enterprise_l1_a_0740 改绑到 enterprise_l1_b_0740。
  2. 刷新 A 一级、A 二级、A 三级的 APP 与 Web 列表。
  3. 刷新 B 一级、B 二级、B 三级的 APP 与 Web 列表。
  4. 刷新 personal_0740 的 APP 与 Web 列表。
  5. 查询设备主数据、库存、物联网卡和历史数据。
- 预期结果
  1. enterprise_l1_a_0740 直接绑定解除，enterprise_l1_b_0740 建立企业一级直接绑定。
  2. A 一级、A 二级、A 三级均不再可见 GT-DEV-0740，A 链全部失效。
  3. 仅 B 一级可见 GT-DEV-0740；B 二级、B 三级默认不可见，需重新逐级分配。
  4. personal_0740 仍可见 GT-DEV-0740，个人绑定关系保留。
  5. 设备主数据、库存、ICCID 8986040740000000040、POS-0740、ALM-0740 均保留且未被改绑删除。

## [P1] 验证管理员改绑清理 A 链业务关联且不迁移给 B 下级
- 测试类型
  - 可靠性
- 前置条件
  1. enterprise_l1_a_0741、enterprise_l2_a_0741、enterprise_l3_a_0741 分别在分组「A 一级组」「A 二级组」「A 三级组」中关联 GT-DEV-0741
  2. A 链围栏「A 一级围栏」「A 二级围栏」「A 三级围栏」均关联 GT-DEV-0741
  3. enterprise_l1_b_0741 已有直属 enterprise_l2_b_0741、enterprise_l3_b_0741，改绑前均不可见 GT-DEV-0741
  4. personal_0741 独立绑定 GT-DEV-0741，并在「个人改绑对照组」「个人改绑对照围栏」中关联该设备
  5. enterprise_l1_b_0741 是有效企业一级账号；GT-DEV-0741 已入库且类型合法，B 不存在重复绑定，企业一级槽位可用且至少剩余 1 个 bindingQuota
  6. admin_0741 有权将 GT-DEV-0741 从 enterprise_l1_a_0741 改绑到 enterprise_l1_b_0741
- 测试步骤
  1. admin_0741 执行企业一级 A→B 改绑。
  2. 查询 A 链三个分组和三个围栏的设备关联。
  3. 刷新 enterprise_l2_b_0741、enterprise_l3_b_0741 的 APP 与 Web 列表。
  4. 刷新 personal_0741 并查询其分组、围栏关系。
  5. 记录 B 一级分组落点的实际结果，但不将其作为本用例通过标准。
- 预期结果
  1. 改绑成功，A 企业一级绑定解除且 B 企业一级绑定建立。
  2. A 链三个分组和三个围栏对 GT-DEV-0741 的关联全部清除，A 的分组与围栏关系不迁移给 B 下级。
  3. B 二级、B 三级不因后台改绑自动获得 GT-DEV-0741，需重新逐级分配。
  4. personal_0741 仍可见 GT-DEV-0741，「个人改绑对照组」「个人改绑对照围栏」关系保持有效。
  5. 因指定真源未定义 B 一级分组落点，本用例仅记录观察结果，不据此判定通过或失败。

## [P1] 验证改绑到已有下级的 B 后需手工逐级分配
- 测试类型
  - 功能
- 前置条件
  1. enterprise_l1_a_0742 当前绑定 GT-DEV-0742
  2. enterprise_l1_b_0742 是有效企业一级账号，直属下级为 enterprise_l2_b_0742，三级为 enterprise_l3_b_0742
  3. GT-DEV-0742 已入库且类型合法，B 不存在重复绑定，企业一级槽位可用且至少剩余 1 个 bindingQuota
  4. enterprise_l2_b_0742 和 enterprise_l3_b_0742 当前设备列表均不含 GT-DEV-0742
- 测试步骤
  1. admin_0742 将 GT-DEV-0742 从 enterprise_l1_a_0742 改绑到 enterprise_l1_b_0742。
  2. enterprise_l2_b_0742、enterprise_l3_b_0742 刷新 APP 与 Web 列表。
  3. enterprise_l1_b_0742 在 Web 向 enterprise_l2_b_0742 分配 GT-DEV-0742。
  4. enterprise_l2_b_0742 在 Web 向 enterprise_l3_b_0742 分配 GT-DEV-0742。
- 预期结果
  1. enterprise_l1_b_0742 获得直接绑定，enterprise_l1_a_0742 失去绑定。
  2. B 二级、B 三级均不因改绑自动获得 GT-DEV-0742。
  3. B 二级在一级手工分配后可见，B 三级仍不可见。
  4. B 三级在二级手工分配后可见，关系严格按一级→二级→三级建立。

## [P3][反向] 验证管理员不能将企业一级设备改绑给二级账号
- 测试类型
  - 安全性
- 前置条件
  1. enterprise_l1_a_0743 绑定 GT-DEV-0743，并分配给 enterprise_l2_a_0743、enterprise_l3_a_0743
  2. admin_0743 尝试将 enterprise_l2_target_0743 作为后台改绑目标
  3. personal_0743 独立绑定 GT-DEV-0743
- 测试步骤
  1. admin_0743 提交将 GT-DEV-0743 从 enterprise_l1_a_0743 改绑到 enterprise_l2_target_0743 的请求。
  2. 查看请求返回和操作状态。
  3. 刷新 A 企业链与 personal_0743 的 APP、Web 设备列表。
  4. 查询 GT-DEV-0743 的全部绑定和分配关系。
- 预期结果
  1. 服务端拒绝以企业二级作为后台直接绑定目标。
  2. 展示可读失败原因，并在目标账号字段或操作失败态中标识失败，不编造未定义精确文案。
  3. A 企业链和 personal_0743 仍按原关系可见 GT-DEV-0743。
  4. enterprise_l1_a_0743 的绑定及下级分配保持不变，enterprise_l2_target_0743 不产生直接绑定。
