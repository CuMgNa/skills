"""Bounded S10U stream framing, with explicit damaged-LEN recovery.

Priority is a syntactically valid header's LEN boundary followed by ']'. Raw
payload brackets therefore do not split an otherwise length-valid candidate.
If LEN cannot yet be satisfied, wait, unless a later complete length-valid
frame provides a recovery anchor. This is necessarily heuristic: an embedded
whole frame and a truncated outer frame cannot always be distinguished online.
After a proven boundary mismatch (or at EOF), ']' is a fallback delimiter, not
proof of a valid frame. Original RX chunks remain the transport's evidence.
"""
import re


_HEADER = re.compile(
    rb"\[[^\x00-\x1f\x7f-\xff*\[\],]{2}\*"
    rb"[^\x00-\x1f\x7f-\xff*\[\],]+\*([0-9A-Fa-f]{4})\*"
)


class Framer:
    def __init__(self, max_buffer=131072):
        if not isinstance(max_buffer, int) or isinstance(max_buffer, bool) or max_buffer < 16:
            raise ValueError("max_buffer必须为至少16的整数")
        self.max_buffer = max_buffer
        self._buffer = bytearray()
        self.issues = []

    def _recovery_anchor(self):
        """Only a whole LEN-valid later candidate is a strong recovery anchor."""
        for match in _HEADER.finditer(self._buffer, 1):
            end = match.end() + int(match.group(1), 16)
            if end < len(self._buffer) and self._buffer[end] == ord("]"):
                return match.start()
        return -1

    def _drain(self, *, final=False):
        frames = []
        while self._buffer:
            start = self._buffer.find(b"[")
            if start == -1:
                self.issues.append(f"丢弃{len(self._buffer)}字节非帧噪声；原始数据见RX chunk日志")
                self._buffer.clear()
                break
            if start:
                self.issues.append(f"帧前噪声{start}字节；原始数据见RX chunk日志")
                del self._buffer[:start]

            header = _HEADER.match(self._buffer)
            expected = header.end() + int(header.group(1), 16) if header else None
            if expected is not None and expected < len(self._buffer) and self._buffer[expected] == ord("]"):
                # LEN takes precedence even over a bracket or header-looking body.
                frames.append(bytes(self._buffer[:expected + 1]))
                del self._buffer[:expected + 1]
                continue

            anchor = self._recovery_anchor()
            if expected is not None and expected >= len(self._buffer) and anchor < 0 and not final:
                # A chunk boundary, including one right after a payload ']', is
                # not evidence of an incorrect LEN. Keep the entire candidate.
                break

            end = self._buffer.find(b"]", 1)
            if anchor >= 0 and (end < 0 or anchor < end):
                self.issues.append(f"截断帧/错误LEN：启发式在后续完整LEN有效帧重同步，跳过{anchor}字节；原始数据见RX chunk日志")
                del self._buffer[:anchor]
                continue
            if end < 0:
                break
            candidate = bytes(self._buffer[:end + 1])
            del self._buffer[:end + 1]
            parts = candidate[1:-1].split(b"*", 3)
            if len(parts) != 4:
                reason = "帧头结构错误"
            elif not re.fullmatch(rb"[0-9a-fA-F]{4}", parts[2]):
                reason = "LEN格式错误"
            else:
                reason = f"LEN边界不符：声明{int(parts[2], 16)}，分隔候选实际{len(parts[3])}"
            context = "连接结束" if final else "已到LEN边界或发现后续合法候选"
            self.issues.append(f"{reason}；{context}，启发式按首个]恢复候选（边界不保证正确）；保留候选原文，完整证据见RX chunk日志")
            frames.append(candidate)
        return frames

    def feed(self, data: bytes) -> list[bytes]:
        if not isinstance(data, (bytes, bytearray, memoryview)):
            raise ValueError("Framer.feed需要bytes")
        data = memoryview(data).cast("B")
        frames = []
        offset = 0
        while offset < len(data):
            capacity = self.max_buffer - len(self._buffer)
            if capacity == 0:
                # Retain a possible next header prefix across a buffer overflow.
                restart = self._buffer.rfind(b"[", 1)
                dropped = restart if restart >= 0 else len(self._buffer)
                self.issues.append(f"接收缓存达到{self.max_buffer}字节上限，跳过{dropped}字节未闭合候选并启发式重同步；原始数据见RX chunk日志")
                del self._buffer[:dropped]
                capacity = self.max_buffer - len(self._buffer)
            size = min(capacity, len(data) - offset)
            self._buffer.extend(data[offset:offset + size])
            offset += size
            frames.extend(self._drain())
        return frames

    def finish(self) -> list[bytes]:
        frames = self._drain(final=True)
        if self._buffer:
            remaining = bytes(self._buffer)
            self._buffer.clear()
            self.issues.append(f"连接结束时残留{len(remaining)}字节不完整帧")
            frames.append(remaining)
        return frames
