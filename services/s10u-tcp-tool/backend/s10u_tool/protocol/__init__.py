"""Lossless S10U ASCII protocol codec. No networking or device side effects."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import re

from .catalog import DOWNLINKS, UPLINKS, POSITION_KEYS, TAIL_KEYS, STATUS_BITS, field_meta, metadata
from .framer import Framer

__all__ = ["metadata", "frame", "encode", "parse", "from_raw", "normal_reply", "Framer"]


def _atom(value, key, *, empty=False):
    if not isinstance(value, str):
        raise ValueError(f"{key}: 必须是字符串")
    if not empty and not value:
        raise ValueError(f"{key}: 缺少必填内容")
    if any(c in value for c in "[],*") or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(f"{key}: 包含协议分隔符或控制字符；使用原始模式测试结构异常")
    try:
        value.encode("ascii")
    except UnicodeEncodeError as exc:
        raise ValueError(f"{key}: 非ASCII编码尚未确认；请使用原始HEX") from exc
    return value


def frame(content: str, device_id: str, manufacturer: str = "3G") -> bytes:
    """Wrap an ASCII body with its exact byte count, never normalize content."""
    _atom(manufacturer, "manufacturer")
    _atom(device_id, "device_id")
    if len(manufacturer) != 2:
        raise ValueError("manufacturer: 厂商标识必须为两个ASCII字节")
    if not isinstance(content, str) or not content:
        raise ValueError("content: 内容不能为空")
    # Commas delimit body fields, but envelope delimiters cannot be escaped.
    _atom(content.split(",", 1)[0], "command")
    for part in content.split(","):
        _atom(part, "content", empty=True)
    body = content.encode("ascii")
    if len(body) > 0xFFFF:
        raise ValueError("LEN: 内容长度超出四位HEX范围")
    return f"[{manufacturer}*{device_id}*{len(body):04X}*".encode("ascii") + body + b"]"


def from_raw(value: str, mode: str) -> bytes:
    """Convert without stripping text or repairing malformed HEX pairs."""
    if not isinstance(value, str):
        raise ValueError("原始内容必须是字符串")
    if mode == "text":
        try:
            return value.encode("ascii")
        except UnicodeEncodeError as exc:
            raise ValueError("文本仅支持ASCII；非ASCII字节请使用HEX") from exc
    if mode == "hex":
        if not re.fullmatch(r"[ \t\r\n]*(?:[0-9a-fA-F]{2}[ \t\r\n]*)*", value):
            raise ValueError("HEX必须是完整字节对，只允许字节间空白，不支持0x前缀")
        return bytes.fromhex(value)
    raise ValueError("mode 必须是 text 或 hex")


def _draft(command, manufacturer, device_id, fields):
    return {"command": command, "manufacturer": manufacturer, "device_id": device_id,
            "time_mode": "fixed", "timezone_offset": "+08:00", "fields": fields}


def _number(value):
    if not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", value):
        return None
    try:
        result = Decimal(value)
        return result if result.is_finite() else None
    except InvalidOperation:
        return None


def _domain(fields, command):
    """Diagnostics do not alter any scalar spelling (including leading zeroes)."""
    warnings = []
    numeric = {"latitude", "longitude", "speed", "direction", "altitude", "satellites", "signal", "battery", "steps", "rolls", "ta", "mcc", "mnc", "accuracy", "interval", "zone"}
    integers = {"satellites", "signal", "battery", "steps", "rolls", "ta", "mcc", "mnc", "interval"}
    ranges = {"latitude": (0, 90), "longitude": (0, 180), "signal": (0, 100), "battery": (0, 100)}
    nonnegative = {"speed", "satellites", "steps", "rolls", "ta", "mcc", "mnc", "accuracy"}
    for key, value in fields.items():
        if key not in numeric:
            continue
        number = _number(value)
        if number is None:
            warnings.append(f"{key}: 不是有限十进制数")
            continue
        if key in integers and not re.fullmatch(r"[+-]?[0-9]+", value):
            warnings.append(f"{key}: 应为整数")
        if key in ranges and not ranges[key][0] <= number <= ranges[key][1]:
            warnings.append(f"{key}: 超出范围{ranges[key][0]}–{ranges[key][1]}")
        if key in nonnegative and number < 0:
            warnings.append(f"{key}: 不应为负值")
        if key == "direction" and not 0 <= number < 360:
            warnings.append("direction: 应在0至360度之间（不含360）")
        if key == "interval" and number <= 0:
            warnings.append("interval: 上传间隔非正数，需确认平台处理（单位秒）")
        if key == "zone" and not -12 <= number <= 14:
            warnings.append("zone: 超出常用民用时区范围；协议未指定可用取值")
    for key, allowed in {"valid": ("A", "V"), "ns": ("N", "S"), "ew": ("E", "W")}.items():
        if key in fields and fields[key] not in allowed:
            warnings.append(f"{key}: 应为 {'/'.join(allowed)}")
    for key, fmt in [("date", "%d%m%y"), ("time", "%H%M%S")]:
        if key in fields:
            try:
                if not re.fullmatch(r"[0-9]{6}", fields[key]):
                    raise ValueError
                datetime.strptime(fields[key], fmt)
            except ValueError:
                warnings.append(f"{key}: 不符合{'DDMMYY真实日期' if key == 'date' else 'HHMMSS有效时间'}")
    if "status" in fields:
        status = fields["status"]
        if not re.fullmatch(r"[0-9A-Fa-f]{8}", status):
            warnings.append("status: 应为8位HEX状态字")
        elif int(status, 16) & ~sum(1 << item["bit"] for item in STATUS_BITS):
            warnings.append("status: 含附录一未定义的置位bit，保留但不推断含义")
    if "bases" in fields and not fields["bases"]:
        warnings.append("bases: 零基站仍保留TA/MCC/MNC是本工具采用的附录字段布局；平台零基站是否省略这些字段待确认，不代表已确认协议支持")
    wifi = fields.get("wifi", [])
    if len(wifi) > 5:
        warnings.append("wifi: 超过附录一最多5条，需确认后发送")
    strengths = []
    for index, record in enumerate(wifi):
        if not re.fullmatch(r"(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}", record["mac"]):
            warnings.append(f"wifi.{index}.mac: 非标准六组MAC；原样保留")
        strength = _number(record["signal"])
        if strength is None:
            warnings.append(f"wifi.{index}.signal: 不是有限十进制数")
        strengths.append(strength)
    if all(s is not None for s in strengths) and any(a < b for a, b in zip(strengths, strengths[1:])):
        warnings.append("wifi: 未按信号强度从强到弱排序；原顺序保留")
    for index, record in enumerate(fields.get("bases", [])):
        for key, value in record.items():
            # Appendix one supplies decimal examples but no cell-signal range.
            if not re.fullmatch(r"[0-9]+", value):
                warnings.append(f"bases.{index}.{key}: 应为非负十进制整数")
    if command == "iccid" and not re.fullmatch(r"[0-9]+", fields["iccid"]):
        warnings.append("iccid: 含非数字字符（文档未指定长度，原文占位符不作为正常值）")
    return warnings


def _timezone(offset):
    if not isinstance(offset, str) or not re.fullmatch(r"[+-][0-9]{2}:[0-9]{2}", offset):
        raise ValueError("timezone_offset: 必须显式使用±HH:MM")
    hours, minutes = map(int, offset[1:].split(":"))
    if hours > 23 or minutes > 59:
        raise ValueError("timezone_offset: 无效时区偏移")
    return timezone(timedelta(minutes=(hours * 60 + minutes) * (-1 if offset[0] == "-" else 1)))


def encode(draft: dict, *, now=None) -> dict:
    """Encode five uplinks; structural uncertainty is an error, anomalies warnings."""
    if not isinstance(draft, dict):
        raise ValueError("draft 必须是对象")
    command = draft.get("command")
    if not isinstance(command, str) or command not in UPLINKS:
        raise ValueError("正常表单仅支持LK、iccid、UD、UD2、AL")
    manufacturer, device_id = draft.get("manufacturer", "3G"), draft.get("device_id")
    fields = deepcopy(draft.get("fields"))
    if not isinstance(fields, dict):
        raise ValueError("fields 必须是对象")
    keys = ["steps", "rolls", "battery"] if command == "LK" else ["iccid"] if command == "iccid" else POSITION_KEYS + TAIL_KEYS + ["bases", "wifi"]
    if set(fields) != set(keys):
        raise ValueError(f"fields: 缺少或未知字段；缺少={sorted(set(keys)-set(fields))}，未知={sorted(map(str, set(fields)-set(keys)))}")
    if command in ("UD", "UD2", "AL"):
        mode = draft.get("time_mode", "fixed")
        if mode not in ("fixed", "realtime"):
            raise ValueError("time_mode 必须是fixed或realtime")
        tz = _timezone(draft.get("timezone_offset", "+08:00"))
        if command != "UD2" and mode == "realtime":
            clock = datetime.now(timezone.utc) if now is None else now
            if not isinstance(clock, datetime) or clock.utcoffset() is None:
                raise ValueError("now 必须是带时区的datetime，不猜测本机时区")
            clock = clock.astimezone(tz)
            fields["date"], fields["time"] = clock.strftime("%d%m%y"), clock.strftime("%H%M%S")
    for key in keys:
        if key not in ("bases", "wifi"):
            _atom(fields[key], key)
    if command in ("LK", "iccid"):
        content = ",".join([command] + [fields[key] for key in keys])
    else:
        for key, record_keys in [("bases", ("area", "id", "signal")), ("wifi", ("name", "mac", "signal"))]:
            if not isinstance(fields[key], list):
                raise ValueError(f"{key}: 必须是记录数组")
            for i, record in enumerate(fields[key]):
                if not isinstance(record, dict) or set(record) != set(record_keys):
                    raise ValueError(f"{key}.{i}: 记录字段不完整或含未知字段")
                for subkey in record_keys:
                    _atom(record[subkey], f"{key}.{i}.{subkey}", empty=subkey == "name")
        values = [command] + [fields[key] for key in POSITION_KEYS]
        values += [str(len(fields["bases"])), fields["ta"], fields["mcc"], fields["mnc"]]
        values += [record[key] for record in fields["bases"] for key in ("area", "id", "signal")]
        values += [str(len(fields["wifi"]))]
        values += [record[key] for record in fields["wifi"] for key in ("name", "mac", "signal")]
        values += [fields["accuracy"]]
        content = ",".join(values)
    result = parse(frame(content, device_id, manufacturer))
    if result["errors"]:
        raise ValueError("; ".join(result["errors"]))
    if command in ("UD", "AL") and draft.get("time_mode") == "realtime":
        for item in result["fields"]:
            if item["key"] in ("date", "time"):
                item["hint"] = "本次实时编码值；发送时按工具timezone_offset重新生成，时区非协议既定值"
    if result["draft"] is not None:
        result["draft"]["timezone_offset"] = draft.get("timezone_offset", "+08:00")
    return result


def _add(packet, key, value, label=None, hint=None):
    field = field_meta(key)
    field["value"] = value
    if label is not None:
        field["label"] = label
    if hint is not None:
        field["hint"] = hint
    packet["fields"].append(field)


def _position(values, packet):
    if len(values) < 22:
        raise ValueError("位置字段不足（附录一需完整固定字段、数量及尾部）")
    fields = dict(zip(POSITION_KEYS, values[:16]))
    for key in POSITION_KEYS:
        _add(packet, key, fields[key])
    index = 16

    def count(key):
        nonlocal index
        value = values[index]
        index += 1
        _add(packet, key, value)
        if not re.fullmatch(r"[0-9]+", value) or len(value) > 5:
            raise ValueError(f"{key}: 无法确定重复字段数量")
        number = int(value)
        if number > (len(values) - index) // 3:
            raise ValueError(f"{key}: 声明数量超过剩余字段可容纳的记录")
        return number

    base_count = count("base_count")
    for key in ("ta", "mcc", "mnc"):
        fields[key] = values[index]
        _add(packet, key, values[index])
        index += 1
    for group, size, subkeys, labels in [("bases", base_count, ("area", "id", "signal"), ("区域码", "基站编号", "基站信号强度")), ("wifi", None, ("name", "mac", "signal"), ("Wi-Fi名称", "MAC地址", "Wi-Fi信号强度"))]:
        if group == "wifi":
            if index >= len(values):
                raise ValueError("缺少wifi_count")
            size = count("wifi_count")
        fields[group] = []
        for i in range(size):
            if index + 3 > len(values):
                raise ValueError(f"{group}: 重复字段不完整")
            record = dict(zip(subkeys, values[index:index+3]))
            fields[group].append(record)
            for key, label in zip(subkeys, labels):
                _add(packet, f"{group}.{i}.{key}", record[key], label=f"{i + 1}. {label}")
            index += 3
    if index != len(values) - 1:
        raise ValueError("位置尾部缺失或含未映射字段；不截断填表")
    fields["accuracy"] = values[index]
    _add(packet, "accuracy", values[index])
    for key in POSITION_KEYS + TAIL_KEYS:
        _atom(fields[key], key)
    for group in ("bases", "wifi"):
        for record in fields[group]:
            for key, value in record.items():
                _atom(value, f"{group}.{key}", empty=key == "name")
    # Noncanonical count spelling cannot survive a normal form's computed count.
    count_values = {f["key"]: f["value"] for f in packet["fields"] if f["key"] in ("base_count", "wifi_count")}
    if count_values["base_count"] != str(base_count) or count_values["wifi_count"] != str(len(fields["wifi"])):
        packet["warnings"].append("重复记录数量含前导零；正常表单将重新计算数量")
    return fields


def parse(data: bytes) -> dict:
    """Return diagnostics for every byte input, never silently normalize raw data."""
    packet = {"hex": "", "text": "", "command": None, "manufacturer": None, "device_id": None,
              "declared_length": None, "actual_length": None, "fields": [], "warnings": [], "errors": [], "draft": None}
    if not isinstance(data, (bytes, bytearray, memoryview)):
        packet["errors"].append("输入必须为bytes")
        return packet
    data = bytes(data)
    packet["hex"] = data.hex(" ").upper()
    packet["text"] = data.decode("ascii", errors="backslashreplace")
    try:
        text = data.decode("ascii")
    except UnicodeDecodeError:
        packet["errors"].append("含非ASCII字节；HEX保留原文，编码未确认，不生成表单")
        return packet
    try:
        if not text.startswith("[") or not text.endswith("]"):
            raise ValueError("外层必须以[开始并以]结束；不自动去除空白")
        parts = text[1:-1].split("*", 3)
        if len(parts) != 4:
            raise ValueError("外层缺少厂商、设备ID、LEN或内容分隔符")
        manufacturer, device_id, length, body = parts
        packet["manufacturer"], packet["device_id"] = manufacturer, device_id
        packet["actual_length"] = len(body.encode("ascii"))
        if re.fullmatch(r"[0-9A-Fa-f]{4}", length):
            packet["declared_length"] = int(length, 16)
            if packet["declared_length"] != packet["actual_length"]:
                packet["warnings"].append(f"LEN不符：声明{packet['declared_length']}字节，实际{packet['actual_length']}字节；原文保留")
        else:
            packet["errors"].append("LEN必须为四位HEX ASCII")
        _add(packet, "manufacturer", manufacturer, "厂商标识")
        _add(packet, "device_id", device_id, "设备ID")
        _add(packet, "length", length, "声明LEN", "仅计算内容ASCII字节，不包含外层")
        _atom(manufacturer, "manufacturer")
        _atom(device_id, "device_id")
        if len(manufacturer) != 2:
            raise ValueError("厂商标识必须为两个ASCII字节")
        if manufacturer != "3G":
            packet["warnings"].append("manufacturer: 非默认3G，大小写原样保留")
        if not re.fullmatch(r"[0-9]{10}", device_id):
            packet["warnings"].append("device_id: 与文档10位数字示例格式不同；原样保留")
        values = body.split(",")
        command = values.pop(0)
        packet["command"] = command
        _add(packet, "command", command, "命令")
        _atom(command, "command")
        for value in values:
            _atom(value, "内容字段", empty=True)
        fields = None
        if command in ("UD", "UD2", "AL") and not (command == "AL" and not values):
            fields = _position(values, packet)
        elif command == "LK" and values:
            if len(values) != 3:
                raise ValueError("LK需按步数、翻滚次数、电量顺序提供3个字段")
            fields = dict(zip(("steps", "rolls", "battery"), values))
        elif command == "iccid":
            if len(values) != 1:
                raise ValueError("iccid需提供且仅提供一个字段，命令保持小写")
            fields = {"iccid": values[0]}
        elif command in ("UPLOAD", "ZONE"):
            if len(values) > 1:
                raise ValueError(f"{command}字段数量不符")
            if values:
                key = "interval" if command == "UPLOAD" else "zone"
                _atom(values[0], key)
                _add(packet, key, values[0])
                if _number(values[0]) is None or (command == "UPLOAD" and not re.fullmatch(r"[+-]?[0-9]+", values[0])):
                    raise ValueError(f"{key}: 参数格式无效")
                packet["warnings"].extend(_domain({key: values[0]}, command))
            else:
                _add(packet, "message_kind", "ack", "消息形态")
        elif command == "VERNO":
            if len(values) > 1:
                raise ValueError("VERNO字段数量不符")
            if values:
                _atom(values[0], "version")
                _add(packet, "version", values[0])
        elif command in ("CR", "POWEROFF", "RESET", "FIND", "LK", "AL"):
            if values:
                raise ValueError(f"{command}不接受附加字段")
        else:
            packet["warnings"].append("未知命令或不支持的消息变种；无专用模板，不推断字段意义")
            for i, value in enumerate(values):
                _add(packet, f"raw.{i}", value, f"原始字段{i + 1}")
        if fields is not None:
            if command in ("LK", "iccid"):
                for key, value in fields.items():
                    _atom(value, key)
                    _add(packet, key, value)
            packet["warnings"].extend(_domain(fields, command))
            if "status" in fields and re.fullmatch(r"[0-9a-fA-F]{8}", fields["status"]):
                status = int(fields["status"], 16)
                for item in STATUS_BITS:
                    _add(packet, f"status.bit.{item['bit']}", "1" if status & (1 << item["bit"]) else "0", item["label"], "附录一：bit从0开始，1有效；不推断未定义位")
            if not packet["errors"]:
                packet["draft"] = _draft(command, manufacturer, device_id, fields)
    except (ValueError, IndexError, OverflowError) as exc:
        packet["errors"].append(str(exc))
    return packet


def normal_reply(packet: dict, version: str = "S10U-SIM-1.0") -> bytes:
    """Simulate only the seven downlinks; never treat an uplink as a command."""
    if not isinstance(packet, dict) or not isinstance(packet.get("hex"), str):
        raise ValueError("需要parse返回的原始packet")
    # Reparse original bytes rather than trusting editable derived fields.
    incoming = parse(from_raw(packet["hex"], "hex"))
    command = incoming["command"]
    if command not in DOWNLINKS:
        raise ValueError("无此命令的正常下行回复模板")
    if incoming["errors"] or incoming["declared_length"] != incoming["actual_length"]:
        raise ValueError("下行报文结构或LEN错误，不能生成正常回执")
    arguments = incoming["text"][1:-1].split("*", 3)[3].split(",")[1:]
    if command in ("UPLOAD", "ZONE"):
        if len(arguments) != 1 or not arguments[0]:
            raise ValueError(f"{command}下行缺少参数（无参数为回执，不再回复）")
    elif arguments:
        raise ValueError(f"{command}下行不能携带参数（不对版本回执再次回复）")
    body = command
    if command == "VERNO":
        body += "," + _atom(version, "version")
    return frame(body, incoming["device_id"], incoming["manufacturer"])
