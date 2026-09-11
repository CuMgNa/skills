"""S10U appendix-one metadata; document examples are evidence, not defaults."""
from copy import deepcopy

UPLINKS = {"LK": "链路保持", "iccid": "ICCID", "UD": "位置上报", "UD2": "盲点补传", "AL": "报警上报"}
DOWNLINKS = {"UPLOAD": "上传间隔", "ZONE": "时区", "VERNO": "版本查询", "CR": "定位请求", "POWEROFF": "关机请求", "RESET": "重启请求", "FIND": "查找设备"}
STATUS_BITS = [
    {"bit": bit, "label": label} for bit, label in [
        (0, "低电状态"), (1, "出围栏状态"), (2, "进围栏状态"),
        (3, "手环戴上取下状态"), (4, "手表运行静止状态"),
        (16, "SOS报警"), (17, "低电报警"), (18, "出围栏报警"),
        (19, "进围栏报警"), (20, "手环拆除报警"),
        (21, "老人手表sos报警(跌倒)"), (22, "心率异常报警"),
    ]
]
POSITION_KEYS = "date time valid latitude ns longitude ew speed direction altitude satellites signal battery steps rolls status".split()
TAIL_KEYS = "ta mcc mnc accuracy".split()
LABELS = dict(zip(POSITION_KEYS, ["日期", "时间", "是否定位", "纬度", "纬度标识", "经度", "经度标识", "速度", "方向", "海拔", "卫星个数", "GSM信号强度", "电量", "计步数", "翻滚次数", "终端状态"]))
LABELS.update(ta="连接基站TA", mcc="MCC国家码", mnc="MNC网号", accuracy="定位精度", iccid="ICCID", base_count="基站数量", wifi_count="Wi-Fi数量", interval="上传间隔", zone="时区", version="版本号")
UNITS = {"speed": "km/h", "direction": "度", "altitude": "米", "battery": "%", "accuracy": "米", "interval": "秒"}
HINTS = {"date": "DDMMYY（日月年）", "time": "HHMMSS；时区由工具设置，非协议既定值", "valid": "A:定位；V:未定位", "ns": "N:北纬；S:南纬", "ew": "E:东经；W:西经", "status": "8位HEX；高16bit报警，低16bit状态；仅解释附录一明确位", "ta": "GSM时延", "mnc": "保留前导零", "signal": "协议范围0–100"}

# Verbatim original examples (including their incorrect lengths / MAC spellings).
POSITION_SAMPLE = "120118,070625,A,22.570720,N,113.8620167,E,0.00,188.6,0.0,9,100,51,14188,0,00000010,6,255,460,0,9360,5081,156,9360,4081,129,9360,4151,128,9360,5082,127,9360,4723,122,9360,4082,120,5,buyaoxialian,a0:c5:f2:b0:7.4:d0,-34,3gtc-5g,92:76:9f:48:4f:20,-48,726,38:37:8b:7:cf:99,-54,3gtc,d0:ae:ec:96:10:54,-63,ceshi,d0:ae:ec:96:10:55,-64,22.4"
SAMPLES = [
    {"command": "LK", "label": "协议LK原样例", "raw": "[3G*8800000015*000D*LK,50,100,100]", "note": "原文LEN=000D，实际000D；步数、翻滚次数、电量。"},
    {"command": "iccid", "label": "协议iccid原样例", "raw": "[3G*8800000015*000D*iccid,xxxxxxxxxxxxxxx]", "note": "文档占位符原样保留；LEN不符；文档未指定ICCID长度。"},
]
for _command, _length in [("UD", "00BC"), ("UD2", "00BD"), ("AL", "00BC")]:
    _body = POSITION_SAMPLE if _command != "AL" else POSITION_SAMPLE.replace("00000010", "00010010", 1)
    SAMPLES.append({"command": _command, "label": f"协议{_command}原样例", "raw": f"[3G*2016001000*{_length}*{_command},{_body}]", "note": "原文LEN与实际长度不符、含异常MAC，全部原样保留；填表后正常编码另算LEN。"})
for _command, _raw in [
    ("UPLOAD", "[3G*8800000015*0009*UPLOAD,600]"), ("ZONE", "[3G*8800000015*0006*ZONE,8]"),
    ("VERNO", "[3G*8800000015*0005*VERNO]"), ("CR", "[3G*8800000015*0002*CR]"),
    ("POWEROFF", "[3G*5678901234*0008*POWEROFF]"), ("RESET", "[3g*5678901234*0005*RESET]"),
    ("FIND", "[3G*5678901234*0004*FIND]"),
]:
    SAMPLES.append({"command": _command, "label": f"协议{_command}下行原样例", "raw": _raw, "note": "保留原文大小写及LEN（UPLOAD原例LEN不符）。"})


def field_meta(key):
    result = {"key": key, "label": LABELS.get(key, key)}
    if key in UNITS:
        result["unit"] = UNITS[key]
    if key in HINTS:
        result["hint"] = HINTS[key]
    return result


def metadata():
    """Return independent JSON-compatible metadata and editable tool defaults."""
    position = dict(zip(POSITION_KEYS, POSITION_SAMPLE.split(",")[:16]))
    position.update(ta="255", mcc="460", mnc="0", accuracy="22.4")
    position["bases"] = [{"area": "9360", "id": "5081", "signal": "156"}]
    position["wifi"] = [{"name": "test-wifi", "mac": "a0:c5:f2:b0:74:d0", "signal": "-34"}]
    defaults = {}
    for command in UPLINKS:
        fields = ({"steps": "50", "rolls": "100", "battery": "100"} if command == "LK" else
                  {"iccid": "89860012345678901234"} if command == "iccid" else deepcopy(position))
        if command == "AL":
            fields["status"] = "00010010"
        defaults[command] = {"command": command, "manufacturer": "3G", "device_id": "2016001000", "time_mode": "realtime" if command in ("UD", "AL") else "fixed", "timezone_offset": "+08:00", "fields": fields}
    groups = [{"key": key, "label": label, "fields": [field_meta(f) for f in fields]} for key, label, fields in [
        ("position", "时间与位置", POSITION_KEYS[:10]), ("device", "设备数据", POSITION_KEYS[10:15]),
        ("status", "状态字", ["status"]), ("network", "基站公共参数", ["ta", "mcc", "mnc"]), ("tail", "尾部", ["accuracy"]),
    ]]
    return deepcopy({"uplinks": [{"command": k, "label": v} for k, v in UPLINKS.items()], "downlinks": [{"command": k, "label": v} for k, v in DOWNLINKS.items()], "groups": groups, "defaults": defaults, "samples": SAMPLES, "status_bits": STATUS_BITS})
