# Graph Report - notion-corpus  (2026-07-20)

## Corpus Check
- Corpus is ~3,997 words - fits in a single context window. You may not need a graph.

## Summary
- 121 nodes · 126 edges · 22 communities (12 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 3% INFERRED · 3% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- 邀请流程与状态机
- 创建群·星豆计费与快照
- 终端路由与会话载体
- 星豆账户资产与运营
- 群信息权限与离群判定
- 终端计费扣费漏斗
- 下行计费与退费状态机
- PTT广播与聊天主页面
- 成员位置功能
- 上行计费与归属锚点
- 欠费回填边界规则
- 账号身份体系
- 归属动态变更计费
- 群成员归属账号
- PTT上下行计费
- 普通聊天室
- SOS求救群聊
- 对讲群(PTT群)
- 设备标签
- 群结束只读冻结
- 充值档位管理
- 距离基准与刷新

## God Nodes (most connected - your core abstractions)
1. `终端上报消息路由转发` - 11 edges
2. `对讲群添加成员(邀请)` - 8 edges
3. `对讲群群信息查看与管理` - 8 edges
4. `成员位置功能(纯监听/查看·不发送)` - 8 edges
5. `对讲群接收处理邀请` - 7 edges
6. `星豆账户资产(按身份隔离·可充值)` - 7 edges
7. `创建对讲群` - 6 edges
8. `报位池(上行/位置子额度)` - 5 edges
9. `星豆(账号级余额·上行兜底)` - 5 edges
10. `扣费三步漏斗(套餐→星豆→兜底)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `星豆账户资产(按身份隔离·可充值)` --cites--> `创建对讲群`  [AMBIGUOUS]
  09-星豆账户资产与运营逻辑点梳理.md → 01-创建对讲群逻辑点梳理.md
- `星豆账户资产(按身份隔离·可充值)` --cites--> `对讲群添加成员(邀请)`  [AMBIGUOUS]
  09-星豆账户资产与运营逻辑点梳理.md → 02-对讲群添加成员邀请逻辑点梳理.md
- `对讲群聊天主页面(三段结构)` --cites--> `对讲群群信息查看与管理`  [AMBIGUOUS]
  08-对讲群聊天室逻辑点梳理.md → 04-对讲群群信息查看与管理逻辑点梳理.md
- `上行(终端→平台)` --cites--> `终端上报消息路由转发`  [AMBIGUOUS]
  06-终端上行计费逻辑点梳理.md → 05-天通应急救援棒终端上报消息路由转发逻辑.md
- `成员位置功能(纯监听/查看·不发送)` --conceptually_related_to--> `报位(位置上行计费单位)`  [INFERRED]
  10-成员位置功能逻辑点梳理.md → 06-终端上行计费逻辑点梳理.md

## Hyperedges (group relationships)
- **星豆扣费快照体系(发起固化·不影响在途·原路退·只退一次)** — notion_corpus_02_koufeikuaizhao, notion_corpus_03_kuaizhao_zonggang, notion_corpus_02_yuanlutuihui, notion_corpus_02_zhiyoutuiyici, notion_corpus_02_tuihuankaiguan [EXTRACTED 0.95]
- **对讲群在/离/结束判定尺(账号是否在群·归零分支·结束两路径)** — notion_corpus_04_zaibuzai_yanchi, notion_corpus_04_guiwei_feiqunzhu, notion_corpus_04_guiwei_qunzhu, notion_corpus_04_qunjieshu_liangtiaolujing [EXTRACTED 0.95]
- **天通救援棒·三会话载体(求救群聊/对讲群/普通聊天室)** — concept_tt_rescue_stick, notion_corpus_05_sos_qiujiuqunliao, notion_corpus_05_duijiangqun_ptt, notion_corpus_05_putong_liaotianshi [EXTRACTED 0.95]
- **扣费三步漏斗参与者(套餐子池→星豆→欠费/封禁兜底)** — notion_corpus_06_koufeiloudou, notion_corpus_06_duanyinchi, notion_corpus_06_baoweichi, notion_corpus_06_xingdou, notion_corpus_06_guishumadian, notion_corpus_06_qiyi_yongbufengjin, notion_corpus_06_geren_bufenjin [EXTRACTED 1.00]
- **下行状态机六态与聊天页Tab映射** — notion_corpus_07_xiaxingzhuangtaiji, notion_corpus_08_jieshouren_list, notion_corpus_08_yiduweidu_tongji, notion_corpus_08_liangtao_yidu, notion_corpus_07_tuifei [EXTRACTED 1.00]
- **套餐四层口径与倒欠铁律** — notion_corpus_08_taocan_siceng, notion_corpus_08_daoqiantielv, notion_corpus_06_taocan_shebei, notion_corpus_06_qiyi_lishiqianfei, notion_corpus_09_yue_e_0_fushu_zhanbu [EXTRACTED 1.00]

## Communities (22 total, 10 thin omitted)

### Community 0 - "邀请流程与状态机"
Cohesion: 0.14
Nodes (15): 并发锁(仅一个成功), 已在群/pending重复邀请拦截, 换群(退原群+入新群), 个人/企业链路按归属严格隔离, 设备同一时间仅属1活跃群, 对讲群添加成员(邀请), 退还开关(快照), 原路退回扣费账号 (+7 more)

### Community 1 - "创建群·星豆计费与快照"
Cohesion: 0.14
Nodes (14): 星豆, 成员上限(设备数), 创建对讲群, 创建扣费开关, 企业默认0豆免扣, 群名校验规则, 群主, 创建失败自动退还星豆 (+6 more)

### Community 2 - "终端路由与会话载体"
Cohesion: 0.17
Nodes (13): 天通应急救援棒(TT_RESCUE_STICK), 双绑场景(1个人+1企业我的), 设备标签(我的/用户/好友), 报警文本(位置派生·不另计费), 对讲群(PTT群), 对讲群镜像报警文本, SOS群聊与对讲群独立可并存, 终端上报消息路由转发 (+5 more)

### Community 3 - "星豆账户资产与运营"
Cohesion: 0.22
Nodes (11): 星豆(账号级余额·上行兜底), 星豆单价(位置1/语音10·可配), 星豆(下行兜底10星豆/条), 充值状态机(待支付→支付中→成功/失败/超时→到账), 套餐购买只能现金·不支持星豆/混合支付, 星豆充值(微信/支付宝·档位·最低一元), 星豆充值订单(订单快照·档位冗余存储), 星豆明细/流水(充值/消费/退还/通信扣费) (+3 more)

### Community 4 - "群信息权限与离群判定"
Cohesion: 0.22
Nodes (10): 权限按钮级控制(无权即隐藏), 群内备注(入群快照·不回写), 归零+非群主=退出(灰已退出·群继续), 归零+群主=群继续·可重新邀请(不自动结束), 群结束仅两条路径(结束群组/群主注销), 对讲群群信息查看与管理, 头像=终端图标实时同步, 账号在不在群=名下是否有设备在本群 (+2 more)

### Community 5 - "终端计费扣费漏斗"
Cohesion: 0.29
Nodes (10): 报位池(上行/位置子额度), 催充提示(设备级·两线都不可用才提示), 短音池(下行/消息子额度), 扣费三步漏斗(套餐→星豆→兜底), 套餐绑设备不绑账号, 双轨独立扣费(短音与报位两平行漏斗), 倒欠铁律(倒欠只在①②层·③层永不显负), 批量购买(N笔子订单+一次聚合支付·逐台独立激活) (+2 more)

### Community 6 - "下行计费与退费状态机"
Cohesion: 0.28
Nodes (9): 上行(终端→平台), 转发路由不在上行侧二次扣费, 退费三约束(失败即退/原路退/原子幂等只退一次), 下行(平台→终端), 下行状态机六态(等待/发送中/未读/已读/失败/已取消), 接收人列表三Tab(未读/已读/失败), 两套已读(终端ACK 0x03/0x05 vs 账号侧聊天页未读), 气泡已读未读失败实时统计(X人已读/Y人未读/Z人失败) (+1 more)

### Community 7 - "PTT广播与聊天主页面"
Cohesion: 0.25
Nodes (9): PTT语音广播下行(服务端自动扇出·逐终端副本), PTT取消分类A-F(整群/单终端/企业级联/换群/归属变化/平台人为), v7群结束两情形(群主结束/账号注销级联), 准发快照(下行副本生成时刻群成员快照), 两类消息(语音短音0x02 + 报警文本镜像), 对讲群聊天主页面(三段结构), 群结束只读(图标/角标/套餐余额仍刷新·其余快照冻结), 账号侧无下发入口(只读监听·消息源唯一终端上报) (+1 more)

### Community 8 - "成员位置功能"
Cohesion: 0.29
Nodes (7): 报位(位置上行计费单位), 10-成员位置功能逻辑点梳理, 成员位置功能(纯监听/查看·不发送), 距离基准=我(当前登录账号实时手机定位), 三层结构(地图层/列表层抽屉/详情层遥测面板), 设备无位置数据·不落点不入列表(全群无则仅显我), 小程序10秒刷新(拉后端最新上报·非实时推送)

### Community 9 - "上行计费与归属锚点"
Cohesion: 0.40
Nodes (5): 纯个人按类型部分封禁, 归属锚点(一级=我的), 企业(含双绑)永不封禁走欠费续传, 无我态/未绑定L14(子池竭即停·不新增账), 解绑后仍可下发(只扣套餐不扣星豆)

### Community 10 - "欠费回填边界规则"
Cohesion: 0.67
Nodes (4): 充星豆≠抵扣套餐欠费(套餐负账只能充套餐清), 企业历史欠费(设备级·新归属不强制承担·充套餐先抵扣), 充星豆≠清偿套餐欠费(企业欠费只能充设备套餐), 星豆余额不显负数(欠费走设备套餐负账·不记星豆负)

### Community 11 - "账号身份体系"
Cohesion: 0.67
Nodes (3): 个人账号, 企业一级账号, 双绑(企业+个人同时=我的)

## Ambiguous Edges - Review These
- `创建对讲群` → `星豆账户资产(按身份隔离·可充值)`  [AMBIGUOUS]
  09-星豆账户资产与运营逻辑点梳理.md · relation: cites
- `对讲群添加成员(邀请)` → `星豆账户资产(按身份隔离·可充值)`  [AMBIGUOUS]
  09-星豆账户资产与运营逻辑点梳理.md · relation: cites
- `对讲群群信息查看与管理` → `对讲群聊天主页面(三段结构)`  [AMBIGUOUS]
  08-对讲群聊天室逻辑点梳理.md · relation: cites
- `终端上报消息路由转发` → `上行(终端→平台)`  [AMBIGUOUS]
  06-终端上行计费逻辑点梳理.md · relation: cites

## Knowledge Gaps
- **25 isolated node(s):** `成员上限(设备数)`, `换群(退原群+入新群)`, `过期时间(默认10分钟·服务端)`, `群主侧邀请记录`, `设备在线/报警/离线状态(全局统一)` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `创建对讲群` and `星豆账户资产(按身份隔离·可充值)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **What is the exact relationship between `对讲群添加成员(邀请)` and `星豆账户资产(按身份隔离·可充值)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **What is the exact relationship between `对讲群群信息查看与管理` and `对讲群聊天主页面(三段结构)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **What is the exact relationship between `终端上报消息路由转发` and `上行(终端→平台)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **Why does `星豆账户资产(按身份隔离·可充值)` connect `星豆账户资产与运营` to `邀请流程与状态机`, `创建群·星豆计费与快照`?**
  _High betweenness centrality (0.323) - this node is a cross-community bridge._
- **Why does `对讲群添加成员(邀请)` connect `邀请流程与状态机` to `创建群·星豆计费与快照`, `终端路由与会话载体`, `星豆账户资产与运营`?**
  _High betweenness centrality (0.300) - this node is a cross-community bridge._
- **Why does `星豆(账号级余额·上行兜底)` connect `星豆账户资产与运营` to `终端计费扣费漏斗`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._