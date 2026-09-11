"""Independent wire goldens, not just encoder/decoder agreement."""
from copy import deepcopy
from datetime import datetime, timezone
import json
import random

import pytest

from s10u_tool.protocol import Framer, encode, frame, from_raw, metadata, normal_reply, parse

# Duplicated intentionally: test truth is not imported from production catalog.
DOCUMENT_UD = b"[3G*2016001000*00BC*UD,120118,070625,A,22.570720,N,113.8620167,E,0.00,188.6,0.0,9,100,51,14188,0,00000010,6,255,460,0,9360,5081,156,9360,4081,129,9360,4151,128,9360,5082,127,9360,4723,122,9360,4082,120,5,buyaoxialian,a0:c5:f2:b0:7.4:d0,-34,3gtc-5g,92:76:9f:48:4f:20,-48,726,38:37:8b:7:cf:99,-54,3gtc,d0:ae:ec:96:10:54,-63,ceshi,d0:ae:ec:96:10:55,-64,22.4]"


def fixed(command="UD"):
    return {"command": command, "manufacturer": "3G", "device_id": "2016001000", "time_mode": "fixed", "timezone_offset": "+08:00", "fields": {
        "date": "090926", "time": "123456", "valid": "A", "latitude": "22.500000", "ns": "N", "longitude": "113.000000", "ew": "E", "speed": "0", "direction": "0", "altitude": "0", "satellites": "9", "signal": "100", "battery": "90", "steps": "0", "rolls": "0", "status": "00000000", "ta": "255", "mcc": "460", "mnc": "02", "accuracy": "1.0", "bases": [], "wifi": []}}


def test_document_sample_preserved_and_full_mapping():
    packet = parse(DOCUMENT_UD)
    assert bytes.fromhex(packet["hex"]) == DOCUMENT_UD
    assert packet["text"].encode() == DOCUMENT_UD
    assert packet["declared_length"] == 188
    assert packet["actual_length"] == 334
    assert not packet["errors"]
    assert any("LEN" in w for w in packet["warnings"])
    assert any("wifi.0.mac" in w for w in packet["warnings"])
    assert any("wifi.2.mac" in w for w in packet["warnings"])
    draft = packet["draft"]
    assert draft["time_mode"] == "fixed"
    f = draft["fields"]
    assert [f[k] for k in ("steps", "rolls", "battery", "mnc", "status", "accuracy")] == ["14188", "0", "51", "0", "00000010", "22.4"]
    assert f["bases"] == [
        {"area": "9360", "id": "5081", "signal": "156"}, {"area": "9360", "id": "4081", "signal": "129"},
        {"area": "9360", "id": "4151", "signal": "128"}, {"area": "9360", "id": "5082", "signal": "127"},
        {"area": "9360", "id": "4723", "signal": "122"}, {"area": "9360", "id": "4082", "signal": "120"}]
    assert len(f["wifi"]) == 5
    assert f["wifi"][0] == {"name": "buyaoxialian", "mac": "a0:c5:f2:b0:7.4:d0", "signal": "-34"}
    assert f["wifi"][2] == {"name": "726", "mac": "38:37:8b:7:cf:99", "signal": "-54"}
    assert f["wifi"][4] == {"name": "ceshi", "mac": "d0:ae:ec:96:10:55", "signal": "-64"}
    rendered = {item["key"]: item["value"] for item in packet["fields"]}
    assert rendered["bases.5.signal"] == "120"
    assert rendered["wifi.4.name"] == "ceshi"
    assert rendered["status.bit.4"] == "1"
    assert rendered["status.bit.16"] == "0"
    assert encode(draft)["text"].encode() == DOCUMENT_UD.replace(b"*00BC*", b"*014E*", 1)


@pytest.mark.parametrize("command,length,status", [("UD", b"014E", b"00000010"), ("UD2", b"014F", b"00000010"), ("AL", b"014E", b"00010010")])
def test_three_position_commands_golden(command, length, status):
    d = parse(DOCUMENT_UD)["draft"]
    d["command"] = command
    d["fields"]["status"] = status.decode()
    expected = DOCUMENT_UD.replace(b"*00BC*UD,", b"*" + length + b"*" + command.encode() + b",", 1).replace(b"00000010", status, 1)
    assert encode(d)["text"].encode() == expected


def test_lk_and_iccid_goldens_no_guessed_iccid_length():
    draft = {"command": "LK", "device_id": "8800000015", "fields": {"steps": "50", "rolls": "100", "battery": "100"}}
    assert encode(draft)["text"] == "[3G*8800000015*000D*LK,50,100,100]"
    assert parse(b"[3G*8800000015*000D*LK,50,100,100]")["draft"]["fields"] == draft["fields"]
    draft.update(command="iccid", fields={"iccid": "123"})
    assert encode(draft)["text"] == "[3G*8800000015*0009*iccid,123]"
    assert not encode(draft)["warnings"]
    assert parse(b"[3G*8800000015*0009*ICCID,123]")["draft"] is None


def test_minimal_position_wire_count_and_mnc_leading_zero():
    packet = encode(fixed())
    expected = "[3G*2016001000*005A*UD,090926,123456,A,22.500000,N,113.000000,E,0,0,0,9,100,90,0,0,00000000,0,255,460,02,0,1.0]"
    # Golden header length is independently specified, not produced by frame().
    assert packet["text"] == expected
    assert packet["draft"]["fields"]["mnc"] == "02"
    assert not packet["errors"]


def test_zero_bases_explicit_layout_warning_in_encode_and_parse():
    raw = b"[3G*2016001000*005A*UD,090926,123456,A,22.500000,N,113.000000,E,0,0,0,9,100,90,0,0,00000000,0,255,460,02,0,1.0]"
    warning = "bases: 零基站仍保留TA/MCC/MNC是本工具采用的附录字段布局；平台零基站是否省略这些字段待确认，不代表已确认协议支持"
    for packet in (encode(fixed()), parse(raw)):
        assert warning in packet["warnings"]
        assert not packet["errors"]
        assert packet["draft"]["fields"]["bases"] == []
        assert [packet["draft"]["fields"][key] for key in ("ta", "mcc", "mnc")] == ["255", "460", "02"]
        assert bytes.fromhex(packet["hex"]) == raw


def test_gsm_signal_range_not_applied_to_base_signal():
    draft = fixed()
    draft["fields"]["bases"] = [{"area": "9360", "id": "5081", "signal": "156"}]
    assert not any("signal" in warning for warning in encode(draft)["warnings"])
    draft["fields"]["signal"] = "101"
    assert any(warning.startswith("signal: 超出范围0–100") for warning in encode(draft)["warnings"])
    assert not any("bases.0.signal" in warning for warning in encode(draft)["warnings"])


def test_metadata_original_samples_and_independent_normal_defaults():
    result = metadata()
    assert [x["command"] for x in result["uplinks"]] == ["LK", "iccid", "UD", "UD2", "AL"]
    assert [x["command"] for x in result["downlinks"]] == ["UPLOAD", "ZONE", "VERNO", "CR", "POWEROFF", "RESET", "FIND"]
    assert next(s["raw"] for s in result["samples"] if s["command"] == "UD").encode() == DOCUMENT_UD
    assert next(s["raw"] for s in result["samples"] if s["command"] == "AL").encode() == DOCUMENT_UD.replace(b"*UD,", b"*AL,").replace(b"00000010", b"00010010")
    assert next(s["raw"] for s in result["samples"] if s["command"] == "UPLOAD") == "[3G*8800000015*0009*UPLOAD,600]"
    for d in result["defaults"].values():
        d["time_mode"] = "fixed"
        assert not encode(d)["warnings"]
        assert not encode(d)["errors"]
    result["defaults"]["UD"]["fields"]["wifi"][0]["name"] = "changed"
    result["status_bits"][0]["label"] = "changed"
    assert metadata()["defaults"]["UD"]["fields"]["wifi"][0]["name"] != "changed"
    assert metadata()["status_bits"][0]["label"] == "低电状态"
    json.dumps(result, allow_nan=False)


def test_status_bit_semantics_are_exact_appendix_one():
    assert {x["bit"]: x["label"] for x in metadata()["status_bits"]} == {
        0: "低电状态", 1: "出围栏状态", 2: "进围栏状态", 3: "手环戴上取下状态", 4: "手表运行静止状态",
        16: "SOS报警", 17: "低电报警", 18: "出围栏报警", 19: "进围栏报警", 20: "手环拆除报警", 21: "老人手表sos报警(跌倒)", 22: "心率异常报警"}
    d = fixed("AL")
    d["fields"]["status"] = "00410011"
    values = {f["key"]: f["value"] for f in encode(d)["fields"]}
    assert {key for key, val in values.items() if key.startswith("status.bit.") and val == "1"} == {"status.bit.0", "status.bit.4", "status.bit.16", "status.bit.22"}
    d["fields"]["status"] = "80000000"
    result = encode(d)
    assert any("未定义" in w for w in result["warnings"])
    assert not any(f["key"] == "status.bit.31" for f in result["fields"])
    assert result["draft"]["fields"]["status"] == "80000000"


@pytest.mark.parametrize("command", ["UD", "AL"])
def test_realtime_explicit_timezone_crosses_day(command):
    d = fixed(command)
    d["time_mode"] = "realtime"
    before = deepcopy(d)
    p = encode(d, now=datetime(2026, 12, 31, 20, 30, 59, tzinfo=timezone.utc))
    assert p["draft"]["fields"]["date"] == "010127"
    assert p["draft"]["fields"]["time"] == "043059"
    assert d == before
    d["timezone_offset"] = "-03:30"
    p = encode(d, now=datetime(2026, 1, 1, 1, 0, 0, tzinfo=timezone.utc))
    assert (p["draft"]["fields"]["date"], p["draft"]["fields"]["time"]) == ("311225", "213000")


def test_ud2_preserves_historical_time_even_if_realtime_requested():
    d = fixed("UD2")
    d["time_mode"] = "realtime"
    p = encode(d, now=datetime(2030, 1, 1, tzinfo=timezone.utc))
    assert p["draft"]["fields"]["date"] == "090926"
    assert p["draft"]["fields"]["time"] == "123456"


@pytest.mark.parametrize("offset", ["UTC", "+24:00", "+08:60", "8", None])
def test_invalid_timezone_is_not_guessed(offset):
    d = fixed()
    d["timezone_offset"] = offset
    with pytest.raises(ValueError):
        encode(d)


def test_naive_now_rejected_and_fixed_mode_does_not_consult_clock():
    d = fixed()
    assert encode(d, now="irrelevant")["draft"]["fields"]["time"] == "123456"
    d["time_mode"] = "realtime"
    with pytest.raises(ValueError):
        encode(d, now=datetime(2026, 1, 1))


@pytest.mark.parametrize("key,value", [("latitude", "91"), ("longitude", "181"), ("battery", "101"), ("signal", "-1"), ("direction", "360"), ("steps", "-1"), ("rolls", "abc"), ("date", "310226"), ("time", "250000"), ("valid", "X"), ("ns", "s"), ("status", "ZZZZZZZZ"), ("speed", "NaN")])
def test_domain_warnings_still_allow_exact_encoding(key, value):
    d = fixed()
    d["fields"][key] = value
    p = encode(d)
    assert any(key in w for w in p["warnings"])
    assert p["draft"]["fields"][key] == value
    assert not p["errors"]


def test_repeated_records_keep_order_duplicates_and_leading_zeroes():
    d = fixed()
    d["fields"]["bases"] = [{"area": "009360", "id": "005081", "signal": "156"}] * 2
    d["fields"]["wifi"] = [{"name": "", "mac": "AA:BB:CC:DD:EE:FF", "signal": "-80"}, {"name": "same", "mac": "AA:BB:CC:DD:EE:FF", "signal": "-10"}] * 3
    p = encode(d)
    assert p["draft"]["fields"]["bases"] == d["fields"]["bases"]
    assert p["draft"]["fields"]["wifi"] == d["fields"]["wifi"]
    assert any("最多5" in w for w in p["warnings"])
    assert any("排序" in w for w in p["warnings"])
    assert ",2,255,460,02,009360,005081,156,009360,005081,156,6," in p["text"]
    assert not p["errors"]


@pytest.mark.parametrize("change", ["missing", "extra", "nonstring", "delimiter", "unicode", "badrecord", "badlist", "empty"])
def test_structural_form_errors_are_blocked(change):
    d = fixed()
    if change == "missing": del d["fields"]["accuracy"]
    if change == "extra": d["fields"]["unknown"] = "123"
    if change == "nonstring": d["fields"]["steps"] = 1
    if change == "delimiter": d["fields"]["mnc"] = "0,1"
    if change == "unicode": d["fields"]["wifi"] = [{"name": "中文", "mac": "00:11:22:33:44:55", "signal": "-10"}]
    if change == "badrecord": d["fields"]["bases"] = [{"area": "1", "id": "2", "signal": "3", "extra": "4"}]
    if change == "badlist": d["fields"]["bases"] = "[]"
    if change == "empty": d["fields"]["date"] = ""
    with pytest.raises(ValueError): encode(d)


@pytest.mark.parametrize("raw", [b"", b"[", b"garbage", b"[3G*x*0002*LK", b" [3G*2016001000*0002*LK]", b"[3G*2016001000*0002*LK]\r\n", b"[3G*2016001000*0001*\xff]", b"[3G*2016001000*ZZZZ*LK]", b"[3G*2016001000*0009*LK,1,2]", b"[3G*2016001000*0002*LK][3G*2016001000*0002*LK]"])
def test_malformed_raw_never_throws_never_loses_bytes(raw):
    p = parse(raw)
    assert bytes.fromhex(p["hex"]) == raw
    assert p["errors"]
    assert p["draft"] is None


def test_incomplete_extra_unknown_and_count_mismatch_refuse_draft():
    for raw in [DOCUMENT_UD[:-6] + b"]", DOCUMENT_UD[:-1] + b",extra]", DOCUMENT_UD.replace(b",6,255,460", b",7,255,460"), DOCUMENT_UD.replace(b",6,255,460", b",X,255,460"), DOCUMENT_UD.replace(b"*UD,", b"*UD_LTE,")]:
        p = parse(raw)
        assert p["draft"] is None
        assert p["warnings"] or p["errors"]
        assert bytes.fromhex(p["hex"]) == raw


@pytest.mark.parametrize("text", ["0", "F F", "0xFF", "GG", "AB C", "AA-BB", "AA BB"])
def test_strict_hex_pairs(text):
    with pytest.raises(ValueError): from_raw(text, "hex")


def test_raw_text_whitespace_and_hex_pairs_are_exact():
    assert from_raw("  [3g*x*0002*LK]\r\n", "text") == b"  [3g*x*0002*LK]\r\n"
    assert from_raw("00ff AB\nCd\t20", "hex") == b"\x00\xff\xab\xcd "
    assert from_raw("", "hex") == b""
    with pytest.raises(ValueError): from_raw("中文", "text")
    with pytest.raises(ValueError): from_raw("AA", "invalid")


@pytest.mark.parametrize("incoming,expected", [
    (b"[3G*8800000015*000A*UPLOAD,600]", b"[3G*8800000015*0006*UPLOAD]"),
    (b"[3G*8800000015*0006*ZONE,8]", b"[3G*8800000015*0004*ZONE]"),
    (b"[3G*8800000015*0005*VERNO]", b"[3G*8800000015*0012*VERNO,S10U-SIM-1.0]"),
    (b"[3G*8800000015*0002*CR]", b"[3G*8800000015*0002*CR]"),
    (b"[3G*5678901234*0008*POWEROFF]", b"[3G*5678901234*0008*POWEROFF]"),
    (b"[3g*5678901234*0005*RESET]", b"[3g*5678901234*0005*RESET]"),
    (b"[AB*5678901234*0004*FIND]", b"[AB*5678901234*0004*FIND]"),
])
def test_all_seven_normal_reply_wire_goldens(incoming, expected):
    assert normal_reply(parse(incoming)) == expected


def test_version_and_physical_parameter_anomalies():
    assert normal_reply(parse(b"[3G*8800000015*0005*VERNO]"), "v1") == b"[3G*8800000015*0008*VERNO,v1]"
    assert normal_reply(parse(b"[3G*8800000015*0009*UPLOAD,-1]")) == b"[3G*8800000015*0006*UPLOAD]"
    assert normal_reply(parse(b"[3G*8800000015*0007*ZONE,99]")) == b"[3G*8800000015*0004*ZONE]"
    for version in ("", "a,b", "中文", "a\n"):
        with pytest.raises(ValueError): normal_reply(parse(b"[3G*8800000015*0005*VERNO]"), version)


@pytest.mark.parametrize("body", ["UPLOAD", "UPLOAD,", "UPLOAD,abc", "UPLOAD,1.5", "UPLOAD,1,2", "ZONE", "ZONE,nan", "CR,1", "VERNO,v1", "LK", "AL", "UNKNOWN"])
def test_reply_rejects_missing_malformed_or_non_downlink(body):
    with pytest.raises(ValueError): normal_reply(parse(frame(body, "2016001000")))


def test_reply_rejects_wrong_length_and_ignores_tampered_derived_fields():
    with pytest.raises(ValueError): normal_reply(parse(b"[3G*8800000015*0009*UPLOAD,600]"))
    p = parse(b"[3g*5678901234*0005*RESET]")
    p.update(command="VERNO", manufacturer="AB", device_id="0000000000")
    assert normal_reply(p) == b"[3g*5678901234*0005*RESET]"


def test_public_frame_exact_no_case_or_whitespace_repair():
    assert frame(content="ZONE,8", device_id="0012345678", manufacturer="3g") == b"[3g*0012345678*0006*ZONE,8]"
    assert frame("VERNO, a ", "2016001000") == b"[3G*2016001000*0009*VERNO, a ]"
    for body in ("", ",1", "a\n", "[]", "a*b", "中文", "a" * 65536):
        with pytest.raises(ValueError): frame(body, "2016001000")
    assert frame("x" * 65535, "2016001000").startswith(b"[3G*2016001000*FFFF*")
    for manufacturer in ("", "G", "123", "中"):
        with pytest.raises(ValueError): frame("LK", "2016001000", manufacturer)


def test_parse_fuzz_no_exceptions_and_exact_hex():
    rng = random.Random(101)
    for _ in range(1000):
        raw = bytes(rng.randrange(256) for _ in range(rng.randrange(200)))
        p = parse(raw)
        assert bytes.fromhex(p["hex"]) == raw
    for _ in range(300):
        body = bytes(rng.choice(b"0123456789ABCDEF,[]*UD") for _ in range(rng.randrange(200)))
        raw = b"[3G*2016001000*0010*" + body + b"]"
        p = parse(raw)
        assert bytes.fromhex(p["hex"]) == raw
