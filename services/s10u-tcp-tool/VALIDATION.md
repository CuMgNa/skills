# 本地实施与验证记录

验证日期：2026-09-09。**首版本地实现及验收通过；不构成真实平台联调或终端硬件验收。**

## 环境与隔离

- Windows 11；Python 3.12.10（本服务独立 `.venv`，未修改Hermes环境）。
- Node.js 24.15.0、npm 11.12.1；浏览器验收使用已安装Chrome。
- Python解析版本见 `requirements.lock`，前端解析版本见 `frontend/package-lock.json`。
- 人工交互与HTTP补充验收：`127.0.0.1:8766`，数据 `.temps/manual-run/`。
- Playwright：自动启动 `127.0.0.1:8767`，数据 `.temps/e2e/`。
- 演练端动态分配localhost TCP端口；从未连接真实平台、外部设备或其他项目数据库。

## 最终执行结果

以下全量命令已由主会话独立重跑，不仅引用子代理报告。

| 检查 | 状态 | 实际结果 |
|---|---|---|
| Python全量测试 | 通过 | **149 passed，2 warnings，1.77秒**：108项协议测试、3项独立字节流属性检查、38项后端测试 |
| 前端类型检查 | 通过 | `vue-tsc --noEmit`无类型错误 |
| 前端单测 | 通过 | Vitest **34项、3文件通过** |
| 生产构建 | 通过，有提示 | Vite构建成功；ElementPlus整包JS约1,081kB、gzip约353kB，超过默认500kB提示线 |
| Playwright端到端 | 通过 | 实际Chrome＋FastAPI＋localhost TCP，**7项通过，25.4秒** |
| Python依赖一致性 | 通过 | `pip check`：No broken requirements found |
| 前端依赖审计 | 通过 | `npm audit --audit-level=low`：found 0 vulnerabilities；仅代表当次数据库审计结果 |
| 最终页面运行检查 | 通过 | 1440×1000截图已实际查看，非空白；服务正常运行、重新导航后控制台0 error/0 warning |
| 真实平台联调 | 未执行 | 设备登记、平台接收解析、业务入库、acked/rejected/timeout均未验证 |

### 执行入口

从本服务目录执行：

```powershell
& .\.venv\Scripts\python.exe -m pytest tests -q
npm --prefix frontend run typecheck
npm --prefix frontend run test -- --run
npm --prefix frontend run test:e2e
& .\.venv\Scripts\python.exe -m pip check
npm --prefix frontend audit --audit-level=low
```

`test:e2e`包含类型检查和生产构建。此次Windows默认pytest系统临时目录出现WinError 5，全量测试改用本服务 `.temps/` 下唯一 `TemporaryDirectory` 作为 `--basetemp`，运行后自动清理；未修改系统权限。等效命令见README。

## 真实浏览器端到端七项

1. 手动LK仅发送一次；网页刷新仍是原TCP会话，不重新连接、不额外上行。
2. 未知原始报文禁止破坏性反填，原始输入保留。
3. 位置字段基站/Wi-Fi增删、状态位编辑保留未知位、固定时间字段可编辑。
4. 中文命名环境保存到SQLite，刷新后仍存在。
5. 异常raw必须确认：取消不发，确认仅发一次，发送字节不修正。
6. 发送A期间编辑为B，返回A的预览明确显示已过期，不冒充B的当前预览。
7. 真实TCP下发VERNO、手动回执、断开并重连后旧记录不可发送，以及鉴权日志下载。

## 主会话额外实际运行验证

- 网页按钮建立演练连接，LK单发并实际收到LK回复；随后UD单次发送，生成的LEN与内容匹配。
- 经本地页面同源HTTP调用演练入口，七项 `UPLOAD/ZONE/VERNO/CR/POWEROFF/RESET/FIND` 均通过真实TCP收到、生成正常回执，并在演练对端日志核对收到字节。
- RESET/POWEROFF后连接保持，CR不产生额外位置上报；七项下行验证前后手动上行仍只有LK和UD两次。
- FIND不回复时TX增量为0；自定义拒绝原文TX增量为1且不改字节；延迟正常回复TX增量为1。自定义拒绝用本地测试字节，仅验证传输，不代表标准拒绝契约。
- 保持已打开页面，停止并重启后端：页面自动重新取得token并恢复实时同步；新run_id、TCP断开、演练停止、日志为空，不重放写请求。
- 重启故障注入期间观察到6次预期WS连接拒绝及1次旧token的401；随后自动恢复。不能把这段故障注入控制台记为零错误。最终正常导航检查为零错误。

## 发现与修复记录

| 问题 | 处理与验证 |
|---|---|
| 浏览器fetch作为对象属性调用触发Illegal invocation | 绑定原生fetch上下文，新增敏感this回归；浏览器恢复正常 |
| 取消旧延迟任务后覆盖新任务状态，存在重复回复窗口 | 发送及取消状态更新均检查task owner；实际进入sleep后取消/替换/并发回归通过 |
| write后drain失败缺少精确发送证据 | 失败日志保留packet、operation_id和原session，标记不确定；同ID不会第二次write |
| SQLite同步等待会阻塞TCP事件循环 | 专用单线程执行器内创建/访问/关闭连接；慢SQLite期间仍可接收FIND；策略提交取消一致性回归通过 |
| Python3.12演练停止先等待server导致活跃客户端死锁 | 先关闭客户端，再等待server；回归通过 |
| 发送响应返回时误用当前编辑签名 | 捕获请求时签名；单测与实际路由延迟E2E通过 |
| 后端重启后页面旧token无法恢复 | 401/1008单飞重新bootstrap、saved/state及WS；不重放写请求；单测和实际重启通过 |
| 分帧过早使用第一个结束符 | 合法声明长度边界优先；异常恢复明确为启发式；黄金字节、随机切分和缓冲限制回归通过 |
| Vitest旧版审计报告2项moderate | 更新锁文件至已验证版本，最终审计0项 |
| 首轮E2E部分选择器未适配ElementPlus | 修正input透传与radio选择器，不更改业务逻辑，最终7项通过 |

人工补充验证首次把ZONE参数误写成`E,8`，工具按契约报字段数量错误，未自动回复，等待条件超时。核对已审阅协议样本`ZONE,8`后更正测试输入，七项全部通过；未改生产代码迎合错误输入。

两项Python警告来自FastAPI/Starlette TestClient的httpx使用及AnyIO BlockingPortal别名弃用，未隐藏警告、未为消除警告修改无关运行逻辑。前端完整ElementPlus包体提示仍保留，本轮不追加无关的打包重构。

## 已核对的协议限制

- UD文档原样例LEN为0x00BC（188），实际ASCII内容为334字节；原文作为异常参考保留，正常生成重新计算。
- 零基站时本工具保留TA/MCC/MNC字段，显式提示该布局待平台确认，不猜省略字段变种。
- 附录一GSM信号范围0–100只用于整体signal，不套用于基站signal=156等字段。
- 非ASCII编码/转义、拒绝回执格式、上线绑定、平台超时起点仍需联调确认。
- 协议无统一流水号，迟到回执和重复同类指令必须结合平台证据核对。
- 坏LEN恢复是启发式：未到齐外层载荷与内部看似合法嵌套帧可能有歧义，原始接收块保留；不声称任意损坏流均可无歧义恢复。
- 无自动心跳、上行ACK超时、AL重发是经确认的工具范围，不代表完整模拟真实终端行为。
- 不包含北斗接入、LTE/WCDMA/CDMA变种或物理设备动作。

## 收尾

- 测试后已停止本轮后端；8766、8767均不再接受连接，浏览器测试页面已关闭。
- 本轮 `.temps/manual-run/`、`.temps/e2e/`、`frontend/test-results/` 已清理，pytest唯一临时目录已自动清理。
- 保留正式源码、文档、依赖锁、独立 `.venv`、前端 `node_modules` 及 `dist`，便于直接使用 `run.cmd`。
- 未修改协议Word、根依赖、其他项目代码；未恢复用户删除、未提交或推送git。
