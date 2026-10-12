# US-003 验证邮箱并注册个人账户

## [P2] 验证北美主流真实邮箱域名可发送验证码并注册
- 测试类型
  - 兼容性
- 前置条件
  1. 可收信测试邮箱gt.reg.20261012@gmail.com、gt.reg.20261012@outlook.com、gt.reg.20261012@icloud.com均未注册；邮件服务与海外网络链路正常
- 测试步骤
  1. 分别使用三个邮箱请求海外注册验证码并记录收件时间
  2. 分别输入各邮箱收到的最新6位验证码，搭配唯一账号名gmail_owner_01、outlook_owner_01、icloud_owner_01和密码MailDomain8!提交注册
  3. 检查三次注册结果和邮件投递记录
- 预期结果
  1. Gmail、Outlook和iCloud域名均通过格式校验并触发邮件发送，不因域名白名单缺失被误拦
  2. 三个可达邮箱均可使用各自验证码创建个人账户，验证码不可串用
  3. 邮件投递记录与目标邮箱一致，每次成功后返回空白登录页且不自动登录

## [P2] 验证澳洲多级域名和企业自建域名兼容
- 测试类型
  - 兼容性
- 前置条件
  1. 可收信邮箱gt.au.20261012@bigpond.com、gt.au.20261012@optusnet.com.au和qa.reg.20261012@farm-control.example.org均未注册；企业测试域名MX配置有效
- 测试步骤
  1. 分别输入三个邮箱并点击Get Code
  2. 检查.com、.com.au和企业多级域名的前后端校验及发送结果
  3. 使用收到的最新验证码分别完成注册
- 预期结果
  1. bigpond.com、optusnet.com.au和farm-control.example.org均通过宽松语法校验
  2. 多级域名和企业自建域名不因固定后缀白名单被误拦，验证码发送到对应邮箱
  3. 三个邮箱均可独立完成个人账户注册，唯一性按完整归一化邮箱判断

## [P4] 验证邮箱本地部分64字符边界可注册且65字符被拒绝
- 测试类型
  - 功能
- 前置条件
  1. 64字符本地部分邮箱aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com未注册；验证码246810有效
- 测试步骤
  1. 输入aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com并请求验证码
  2. 使用验证码246810和账号名mail_local_64、密码LocalPart8!提交注册
  3. 重新打开注册页，输入65字符本地部分邮箱aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com并尝试获取验证码
- 预期结果
  1. 64字符本地部分通过格式校验并允许发送验证码
  2. 64字符边界邮箱可完成注册且按完整邮箱保存
  3. 65字符本地部分显示邮箱格式或长度错误，Get Code不可发送，服务端直调同样拒绝

## [P4] 验证邮箱整体长度254字符边界可用且255字符被拒绝
- 测试类型
  - 功能
- 前置条件
  1. 测试邮件网关可路由长地址；254字符邮箱为aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd；该邮箱未注册
- 测试步骤
  1. 输入上述254字符邮箱并触发前后端格式校验
  2. 输入255字符邮箱aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd并触发校验
  3. 检查验证码发送记录和账户数据
- 预期结果
  1. 254字符邮箱通过长度校验；邮件网关可达时允许发送验证码和继续注册
  2. 255字符邮箱被客户端与服务端拒绝并显示长度或格式错误
  3. 仅254字符邮箱可能产生发送记录；255字符邮箱无验证码发送记录且无账户数据

## [P3][反向] 验证明显非法邮箱格式均被拒绝且不发送验证码
- 测试类型
  - 功能
- 前置条件
  1. 海外版注册页与验证码发送接口可用
- 测试步骤
  1. 依次输入plainaddress、a@@example.com、@example.com、owner@、owner@example和owner@example.123并点击Get Code
  2. 检查每次字段提示和网络请求
  3. 查询邮件发送日志
- 预期结果
  1. 无@、多个@、@前为空、@后为空、域名不含点、末段非字母均被识别为非法
  2. Get Code保持不可用或提交被前端拦截；绕过前端时服务端也拒绝
  3. 所有非法地址均无验证码邮件发送记录

## [P1][反向] 验证邮箱按首尾空格与大小写归一化后全局唯一
- 测试类型
  - 功能
- 前置条件
  1. 个人账户existing_mail_01已绑定邮箱owner.case@example.com；企业账户中不存在其他同邮箱记录
- 测试步骤
  1. 在海外注册页输入邮箱“  Owner.Case@Example.COM  ”及未占用账号名mail_normalized_01
  2. 请求验证码并尝试提交注册
  3. 查询邮箱归一化索引和账户数据
- 预期结果
  1. 系统去除首尾空格并按统一大小写口径得到owner.case@example.com
  2. 请求或提交被拒绝并提示邮箱已注册，不向该地址创建新的注册凭据
  3. 全局仅原个人账户占用该归一化邮箱，不创建重复个人或企业账户

## [P1] 验证归一化相同邮箱并发注册最多一个请求成功
- 测试类型
  - 可靠性
- 前置条件
  1. race.mail.20261012@example.com未注册；已为Race.Mail.20261012@Example.com和“ race.mail.20261012@example.com ”签发可测试的注册验证码135790与246802
- 测试步骤
  1. 使用两个不同账号名race_mail_a和race_mail_b并发提交注册，请求中的邮箱分别为Race.Mail.20261012@Example.com和带首尾空格的race.mail.20261012@example.com
  2. 收集响应并查询归一化邮箱索引
  3. 检查失败请求的账户、验证码和权限副作用
- 预期结果
  1. 两个邮箱输入归一化为同一唯一键race.mail.20261012@example.com
  2. 数据库唯一约束保证最多一个注册成功，归一化邮箱仅关联一个accountId
  3. 失败请求不创建账户、不占用账号名且不消费对应验证码

## [P3] 验证Gmail点号及加号别名唯一性遵循产品配置口径
- 测试类型
  - 兼容性
- 前置条件
  1. 准备可收信Gmail邮箱gttestowner@gmail.com及别名gt.test.owner@gmail.com、gttestowner+reg@gmail.com；产品尚未确认三者是否按同一邮箱去重
- 测试步骤
  1. 查询当前环境邮箱归一化配置和产品确认记录
  2. 先用gttestowner@gmail.com注册，再分别用gt.test.owner@gmail.com与gttestowner+reg@gmail.com尝试获取验证码和注册
  3. 记录接口响应、归一化值、账户数量和邮件到达情况并与已发布配置口径比对
- 预期结果
  1. 测试前必须取得当前配置或明确标记“口径未确认”，不得预设点号或plus别名一定重复或一定独立
  2. 系统行为在注册、登录、找回密码和唯一索引中保持同一口径；若无已发布口径，仅记录现状并阻断确定性验收结论
  3. 测试报告给出实际结果与配置差异，不能把Gmail别名策略写成固定业务规则

## [P3] 验证临时邮箱域名注册行为遵循产品配置口径
- 测试类型
  - 兼容性
- 前置条件
  1. 准备受控临时邮箱地址gt-reg-20261012@mailinator.com；产品尚未确认临时邮箱黑名单、MX校验或域名白名单策略
- 测试步骤
  1. 查询当前环境临时邮箱、MX及域名黑白名单配置
  2. 输入gt-reg-20261012@mailinator.com并尝试获取验证码和注册
  3. 记录前端提示、接口响应、发送日志和账户结果并与已发布产品口径比对
- 预期结果
  1. 测试前必须取得当前配置或明确标记“口径未确认”，不得预设临时邮箱必然放行或必然拦截
  2. 系统实际行为应与当前生效配置一致；无已发布口径时只记录现状与垃圾注册风险，不作通过或失败的确定性结论
  3. 测试报告保留配置版本、实测结果和待产品确认项，不把临时邮箱策略固化为注册规则
