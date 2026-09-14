# 星联卫士联调：固件烧录与 App 运行

本文只写本机联调怎么编、怎么烧、怎么装、怎么看日志。  
协议条文见 `d:\work\code field\rescuesat-tcp-platform\docs\星联卫士App对接文档\`。

## 1. 本机环境

| 项 | 值 |
|---|---|
| 固件工程 | `d:\work\code field\tt_rescue_stick` |
| App 工程 | `d:\work\code field\rescuable-xinglian-weishi` |
| BLE SDK 源码 | `d:\work\code field\rescuesat-ble-sdk` |
| Python | `C:\Users\31470\AppData\Local\Python\pythoncore-3.14-64\python.exe` |
| JDK | `C:\Users\31470\.jdks\jbr-21.0.11` |
| Android SDK | `C:\Users\31470\AppData\Local\Android\Sdk` |
| adb | `%ANDROID_SDK%\platform-tools\adb.exe` |
| Keil | `D:\keil5\UV4\UV4.exe` |
| ARMCC | `D:\keil5\ARM\ARMCC\Bin\Armcc.exe` |
| 手机序列号 | `E6U8QCRWSOPZMJWC` |
| App 包名 | `com.xinglian.weishi` |
| 终端 BLE MAC | `DC:32:62:53:03:44` |
| 终端号 | `202606030046` |
| 广播名 | `PD_202606030046` |
| 联调平台 | `120.77.17.225:10306` |

烧录**不用 J-Link**，只用 BLE YMODEM（`$CCUPG`）。

---

## 2. 编固件

产物默认路径：

```text
tt_rescue_stick\Code\MainProgram\MDK\output\release\tt_rescue_stick_app_v1_1_5_20260820C.bin
```

Keil 工程在 `tt_rescue_stick\Code\MainProgram\MDK`。用 UV4 打开对应 `.uvprojx` 后做 **Rebuild**（全量），不要只点增量 Build。

也可以直接调 ARMCC / ArmLink / fromelf（比 UV4 批处理更稳）。注意：

- 改过 `app_ble_app.c`、`app_tt.c`、`tt_platform.c`、`tt_relay_sim.c` 后，相关 `.o` 必须重编。
- **不要混编**：只重链、不全量重编，Code 段大小会突然变小，现场行为会对不上源码。
- 不要编 TOSIG 专项包当正式包用。

编完先确认 `.bin` 的修改时间和文件大小再烧。

---

## 3. 烧固件（BLE YMODEM）

脚本：`tt_rescue_stick\flash-ble-ymodem.py`  
依赖：`bleak`（本机 Python 已装即可）。

### 3.1 烧之前必须做

手机 App 占着 GATT 时，电脑脚本扫不到、连不上终端。

```powershell
$adb = "C:\Users\31470\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s E6U8QCRWSOPZMJWC shell am force-stop com.xinglian.weishi
```

停完等约 0.5～2 秒再烧。终端上电、蓝牙可被发现。

### 3.2 烧

```powershell
$py = "C:\Users\31470\AppData\Local\Python\pythoncore-3.14-64\python.exe"
& $py "d:\work\code field\tt_rescue_stick\flash-ble-ymodem.py"
```

默认：

- `--addr DC:32:62:53:03:44`
- `--bin` 指向上面的 release `.bin`

换地址或换文件：

```powershell
& $py "d:\work\code field\tt_rescue_stick\flash-ble-ymodem.py" --addr DC:32:62:53:03:44 --bin "d:\path\to\app.bin"
```

成功标志：控制台出现 `YMODEM DONE`（末尾 `end ACK timeout` 可以忽略，设备可能已经复位）。

失败常见原因：

1. App 没 force-stop，GATT 被占。
2. 电脑蓝牙没开，或 MAC 不对。
3. 上一次 YMODEM 没结束，脚本会先发 5 个 `CAN` 清场；仍失败就给终端重新上电再烧。
4. 手机又自动连回去了，再 force-stop 一次。

烧完终端会复位。等广播名重新出现后再开 App。

---

## 4. 编 App 并安装

App 依赖：

- **工程模块** `:rescuesat-ble-core`（`settings.gradle.kts` 已 include `../rescuesat-ble-sdk/rescuesat-ble-core`）——改 core 协议/上行状态机后 **直接编 App** 即可。
- **本地 AAR** `rescuable-xinglian-weishi\app\libs\rescuesat-ble-release.aar`（`RescueSatBleClient` Android 层）。

改了 `rescuesat-ble`（Android 层）或发 release 前，重出 AAR 并拷进 `app\libs`。`rescuesat-ble-core-1.0.0.jar` 仍保留在 `app\libs` 供对照，日常开发以工程模块为准。

### 4.1 重出 SDK（有协议改动时）

```powershell
$env:JAVA_HOME = "C:\Users\31470\.jdks\jbr-21.0.11"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = "C:\Users\31470\AppData\Local\Android\Sdk"

Set-Location "d:\work\code field\rescuesat-ble-sdk"
.\gradlew.bat :rescuesat-ble-core:jar :rescuesat-ble:assembleRelease --no-daemon

Copy-Item -Force `
  "d:\work\code field\rescuesat-ble-sdk\rescuesat-ble-core\build\libs\rescuesat-ble-core-1.0.0.jar" `
  "d:\work\code field\rescuable-xinglian-weishi\app\libs\rescuesat-ble-core-1.0.0.jar"
Copy-Item -Force `
  "d:\work\code field\rescuesat-ble-sdk\rescuesat-ble\build\outputs\aar\rescuesat-ble-release.aar" `
  "d:\work\code field\rescuable-xinglian-weishi\app\libs\rescuesat-ble-release.aar"
```

两个文件都要拷。AAR 里不含 core 模块。

### 4.2 编 Debug APK

换过 `app\libs` 或怀疑增量没吃到依赖时，用 clean：

```powershell
$env:JAVA_HOME = "C:\Users\31470\.jdks\jbr-21.0.11"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = "C:\Users\31470\AppData\Local\Android\Sdk"

Set-Location "d:\work\code field\rescuable-xinglian-weishi"
.\gradlew.bat :app:clean :app:assembleDebug --no-daemon
```

只改了 App Kotlin、没动 JAR 时，`:app:assembleDebug` 即可。

产物：

```text
rescuable-xinglian-weishi\app\build\outputs\apk\debug\app-debug.apk
```

### 4.3 安装到真机

```powershell
$adb = "C:\Users\31470\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$apk = "d:\work\code field\rescuable-xinglian-weishi\app\build\outputs\apk\debug\app-debug.apk"

& $adb -s E6U8QCRWSOPZMJWC install -r $apk
& $adb -s E6U8QCRWSOPZMJWC shell am force-stop com.xinglian.weishi
```

`install -r` 会保留 `shared_prefs`（含 UDP 中转 7 天授权）。要干净环境再清数据。

---

## 5. 跑 App

`MainActivity` **没有 exported**，下面这条会 Permission Denial，不要用：

```text
adb shell am start -n com.xinglian.weishi/.MainActivity
```

用桌面图标，或：

```powershell
$adb = "C:\Users\31470\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s E6U8QCRWSOPZMJWC shell monkey -p com.xinglian.weishi -c android.intent.category.LAUNCHER 1
```

### 5.1 连接终端

1. 手机蓝牙打开，附近设备 / 定位权限已授。
2. 终端已上电，广播名 `PD_202606030046`。
3. 顶栏「蓝牙已断开，点击重新连接」，或 **设置 → 连接设备**。
4. 连上后顶栏先出现终端号。卫星状态看 `$TOSTA` 最后一列：
   - `0` 已断网
   - `1` 搜星中
   - `2` 已联网（平台 `0x80` 已回到终端）

点顶栏在**已连接**时是断开确认，不是断网提示。

### 5.2 UDP 中转（联调平台必开）

设置页打开 UDP 透传后，App 会：

1. `$TIADD,0` 读终端里的平台地址（当前为 `120.77.17.225:10306`）
2. 本机绑 UDP
3. `$TIREL,1` 让终端走空口中转
4. 把 `$TOUDP` 转到平台，把平台回包用 `$TIUDP` 灌回终端

中转授权写在 `shared_prefs/xinglian_udp_relay.xml` 的 `enabled_at`，约 7 天。  
装新包一般不用重开；清数据后要再开一次。

没有中转时，登录包到不了这台电脑对面的平台，顶栏会一直「搜星中」，消息也发不出去（门闩要 `net=2`）。

### 5.3 发一条文本验收

顶栏已是「已联网」后再发。过线应同时看到：

- App：发送成功
- 平台：该终端 `0x80`（登录）和本条 `0x83`（回执）
- 终端：`$TODST,<seq>,4` 以及 `$TOACK`

电脑 BLE 脚本通，不能代替 App + 终端 + 平台同一场。

---

## 6. 看日志

```powershell
$adb = "C:\Users\31470\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s E6U8QCRWSOPZMJWC shell "run-as com.xinglian.weishi ls -l files/debug-logs"
& $adb -s E6U8QCRWSOPZMJWC shell "run-as com.xinglian.weishi cat files/debug-logs/ble-2026-09-08.jsonl"
& $adb -s E6U8QCRWSOPZMJWC shell "run-as com.xinglian.weishi cat files/debug-logs/udp-2026-09-08.jsonl"
```

日期按手机当天本地日期。`ble-*.jsonl` 是 GATT 上的 `$TI/$TO`，`udp-*.jsonl` 是中转开关和 UDP 出入包。

logcat：

```powershell
& $adb -s E6U8QCRWSOPZMJWC logcat -s XinglianBle:D UdpRelay:I UdpRelay:W
```

设置 → 指令调试 也能看实时帧。不要随手点清空，除非你确定不要当天文件。

---

## 7. 注意事项（按踩过的坑）

1. **烧录前必须 force-stop App**，否则电脑连不上 CH9142。
2. **烧录不用 J-Link**，只用 `flash-ble-ymodem.py`。
3. **固件要整编**，增量链接可能混进旧 `.o`。
4. **改 SDK 必须换 `app\libs` 里的 JAR/AAR，并 clean 编 App**。旧包会报 `unknown cmd: TOUDP`。
5. **不要用 `am start -n ...MainActivity`**，用 monkey 或图标。
6. 电脑脚本证明通道 ≠ App 过线。验收以 App 顶栏、平台回执、`$TODST=4` 为准。
7. 连上蓝牙会开天通；断开后关模块只认原来的 30 秒空闲，不要另造一套超时。
8. 关中转用 `$TIREL,0`，不要伪造成功回执，不要编 TOSIG 充数。
9. 一台终端同时只能被一个 GATT 占用：App、烧录脚本、电脑探针不要一起连。
10. 协议文档改条文时版本按 **+0.1**；只改实现、不改条文则不动文档版本。

---

## 8. 推荐顺序

同一场联调建议按这个来：

1. 整编固件，确认 `.bin` 时间。
2. `adb force-stop` App。
3. `flash-ble-ymodem.py` 烧录，等到 `YMODEM DONE`。
4. 若动过 SDK：重出 JAR/AAR → 拷进 `app\libs` → `clean assembleDebug`。
5. `adb install -r`，再 force-stop，用 monkey 启动。
6. 连终端，确认设置里 UDP 中转仍开着。
7. 等顶栏「已联网」。
8. 发一条短文本，对平台 `0x83` 和 `$TODST,seq,4`。
9. 跑 §9 全量验收，更新 `联调功能全量回归测试报告-2026-09-08.md`。
10. **全部通过后**按 §10 关 App、关中转、关终端。

---

## 9. 全量验收（联调通过标准）

联调**全部通过**后再进入 §10 关终端。

| 门禁 | 内容 | 命令/位置 |
|------|------|-----------|
| G1 | 固件 ABCD | `tt_rescue_stick\tools\relay_abcd_test.py`（先 `adb force-stop` App） |
| G2 | App 文本过线 | §5.3：顶栏「已联网」→ 发短文本 → `$TODST,seq,4` |
| G3 | 关 UDP 透传 | 设置 → 指令调试 → 关 UDP 中转（或 `$TIREL,0`） |
| G4 | 全量 UI | `联调功能全量回归测试报告-2026-09-08.md`（114 控件清单） |
| G5 | 交付功能 F1–F6 | 同上报告 §一 |

**日志与脚本输出：**

- 报告：`联调功能全量回归测试报告-2026-09-08.md`
- ABCD log：`tt_rescue_stick\Doc\relay_abcd_run_2026-09-08-final.log`
- App BLE/UDP：`run-as com.xinglian.weishi cat files/debug-logs/ble-*.jsonl`

**已知非阻塞项（不算 Gate 失败）：** ABCD 的 B3 登录竞态、D4「复连 30s 后 ttMod=1」（协议复连自动开天通，见 ABCD 报告 D4 说明）。

---

## 10. 收尾：关 App、关中转、关终端

**仅当 §9 门禁全部通过时执行。**

1. App → **指令调试** → 关闭 **UDP 中转**（推荐，等价 `$TIREL,0`，应看到 `$TOREL,0`）
2. App → **设置** → **断开设备** → 确定（或消息/地图顶栏 → 断开确认）
3. 电脑释放 GATT：

```powershell
$adb = "C:\Users\31470\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s E6U8QCRWSOPZMJWC shell am force-stop com.xinglian.weishi
```

4. **等待 ≥30 秒**，期间不要用 App、BLE 脚本或烧录再连终端（天通模块空闲关机）
5. （可选）bleak 连 MAC 发 `$TIQRY,0`，期望 `$TOSTA ... ttMod=0 net=0`
6. 长期收纳：**物理关闭终端电源**

勿用 `pm clear com.xinglian.weishi`（会清除 UDP 7 天授权）。
