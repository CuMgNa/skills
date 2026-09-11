"""Stream recovery goldens with adversarial byte boundaries."""
import pytest
from s10u_tool.protocol import Framer

LK = b"[3G*2016001000*0002*LK]"
FIND = b"[3G*2016001000*0004*FIND]"
BAD_LONG = b"[3G*2016001000*FFFF*RESET]"
BAD_SHORT = b"[3G*2016001000*0001*ZONE,8]"


def test_sticky_and_every_two_chunk_split():
    wire = LK + FIND
    for index in range(len(wire) + 1):
        framer = Framer()
        result = framer.feed(wire[:index]) + framer.feed(wire[index:])
        assert result == [LK, FIND]
        assert framer.finish() == []
        assert not framer.issues


def test_single_byte_chunks():
    framer = Framer()
    output = []
    for byte in LK + FIND:
        output.extend(framer.feed(bytes([byte])))
    assert output == [LK, FIND]
    assert not framer.issues


@pytest.mark.parametrize("bad", [BAD_LONG, BAD_SHORT, b"[3G*2016001000*ZZZZ*CR]", b"[broken]"])
def test_bad_length_does_not_swallow_following_frame(bad):
    for index in range(len(bad + FIND) + 1):
        framer = Framer()
        wire = bad + FIND
        output = framer.feed(wire[:index]) + framer.feed(wire[index:])
        assert output == [bad, FIND]
        assert framer.issues
        assert framer.finish() == []


def test_nested_start_recovers_truncated_frame():
    framer = Framer()
    assert framer.feed(b"[3G*2016001000*FFFF*truncated" + FIND) == [FIND]
    assert any("重同步" in issue for issue in framer.issues)


def test_noise_and_binary_bytes_diagnostic_and_candidate_preservation():
    framer = Framer()
    binary = b"[3G*2016001000*0001*\xff]"
    assert framer.feed(b"\x00\xffgarbage" + LK + b"\r\n" + binary) == [LK, binary]
    assert any("噪声" in issue for issue in framer.issues)
    framer.issues.clear()
    assert framer.issues == []


def test_finish_returns_exact_residual_once_and_reusable():
    framer = Framer()
    partial = b"[3G*2016001000*0002*L"
    assert framer.feed(partial) == []
    assert framer.finish() == [partial]
    assert framer.finish() == []
    assert any("残留" in issue for issue in framer.issues)
    assert framer.feed(LK) == [LK]


def test_bounded_overflow_and_recovery_in_same_huge_chunk():
    framer = Framer(max_buffer=32)
    wire = b"[" + b"x" * 4096 + FIND + LK
    assert framer.feed(wire) == [FIND, LK]
    assert len(framer._buffer) <= 32
    assert any("上限" in issue for issue in framer.issues)
    assert not framer.finish()


def test_exact_bound_is_complete_not_overflow():
    framer = Framer(max_buffer=len(FIND))
    assert framer.feed(FIND + FIND) == [FIND, FIND]
    assert not framer.issues


@pytest.mark.parametrize("value", [0, 15, -1, True, "32"])
def test_invalid_bound(value):
    with pytest.raises(ValueError): Framer(value)


@pytest.mark.parametrize("raw", [
    b"[3G*2016001000*0001*]]",
    b"[3G*2016001000*0001*[]",
    b"[3G*2016001000*000B*abc]def[ghi]",
    b"[3G*2016001000*0004*[]][]",
])
def test_valid_length_with_brackets_in_payload_every_split(raw):
    for index in range(len(raw) + 1):
        framer = Framer()
        assert framer.feed(raw[:index]) + framer.feed(raw[index:]) == [raw]
        assert not framer.issues
        assert framer.finish() == []
    framer = Framer()
    result = []
    for byte in raw + FIND:
        result.extend(framer.feed(bytes([byte])))
    assert result == [raw, FIND]
    assert not framer.issues


def test_length_priority_over_whole_nested_header_when_boundary_available():
    raw = b"[3G*2016001000*0019*X[3G*2016001000*0002*LK]Y]"
    framer = Framer()
    assert framer.feed(raw + FIND) == [raw, FIND]
    assert not framer.issues


def test_premature_payload_closer_waits_for_declared_boundary():
    framer = Framer()
    prefix = b"[3G*2016001000*000B*abc]"
    assert framer.feed(prefix) == []
    assert not framer.issues
    assert framer.feed(b"def[ghi]") == [prefix + b"def[ghi]"]
    assert not framer.issues


def test_wrong_long_length_without_anchor_waits_until_eof():
    framer = Framer()
    assert framer.feed(BAD_LONG) == []
    assert framer.finish() == [BAD_LONG]
    assert any("启发式" in issue and "连接结束" in issue for issue in framer.issues)


def test_protocol_document_wrong_short_length_still_emits_candidate():
    raw = b"[3G*8800000015*0009*UPLOAD,600]"
    framer = Framer()
    assert framer.feed(raw + FIND) == [raw, FIND]
    assert any("LEN" in issue and "启发式" in issue for issue in framer.issues)


def test_invalid_chunk_type():
    with pytest.raises(ValueError): Framer().feed("LK")
