# 固件 ↔ Android 库对照

| 固件 | Android |
|------|---------|
| `app_ble_app_on_rx` | `BleProtocolPipeline.feedIncoming` |
| `ble_app_reply_todst` | `BleMessage.ToDst` → `UplinkSession` |
| `app_ble_app_on_platform_ack` | `ToAck` + `TODST=4` |
| `ble_app_gate_check` | `SendGate` + 固件回 `TODST=0` |
| `device_ble_name_set` S1_PD_ | `RescueSatBleConfig.scanNameFilter` |
| `BLE_APP_SEQ_MIN/MAX` | `BleConstants.SEQ_MIN/MAX` |
| `$TOLVO` 读拷贝推送 | `LocalVoiceMergeBuffer` + `onLocalVoice`；SDK 自动 `$TILVA` |
| `$TILGN` 静默重登 | `RescueSatBleClient.requestRelogin()` |

验收：见 [Android/README.md](../Android/README.md)（链到 App 仓 `BLE交互链路说明.md`）。
