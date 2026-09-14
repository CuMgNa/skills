# 设备-APP 协作模型

以 [星联卫士 终端与 APP 交互协议](星联卫士-终端与APP交互协议.md)（**v2.7**）为准。Word 版：[星联卫士-终端与APP交互协议v2.7.docx](星联卫士-终端与APP交互协议v2.7.docx)。

- APP 解析 `$xxxx`；不组包、不解析 UDP，不保存授权码。
- 终端独占 UDP V1.11：登录、报位、按键语音、已接收、已读、授权码。
- 查询与 Notify 同帧：`$TOSTA` / `$TOLOC` / `$TOSIG` / `$TODST` / `$TOACK`。
- 上报分 `$TITXT` / `$TIVOI` / `$TIIMG`；发送条件为 `netStatus=2`。
