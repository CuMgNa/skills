"""Independent deterministic byte-stream checks, without a real platform."""
import random

from s10u_tool.protocol import Framer, parse


def test_parser_preserves_arbitrary_binary_inputs_without_crashing():
    rng = random.Random(41017)
    cases = [b'', b'[]', b'[3G*x*FFFF*UD,', bytes(range(256))]
    cases.extend(rng.randbytes(rng.randrange(512)) for _ in range(1000))
    for data in cases:
        result = parse(data)
        assert bytes.fromhex(result['hex']) == data
        assert isinstance(result['errors'], list)
        assert isinstance(result['warnings'], list)


def test_random_tcp_partitioning_keeps_independent_known_frames():
    # Constants intentionally do not use the production frame() constructor.
    frames = [
        b'[3G*2016001000*000B*LK,100,0,80]',
        b'[3G*2016001000*0005*VERNO]',
        b'[3G*2016001000*000A*UPLOAD,600]',
    ]
    stream = b''.join(frames * 5)
    rng = random.Random(701)
    for _ in range(100):
        framer, received, offset = Framer(), [], 0
        while offset < len(stream):
            count = rng.randrange(1, 70)
            received.extend(framer.feed(stream[offset:offset + count]))
            offset += count
        assert received == frames * 5
        assert framer.finish() == []
        assert framer.issues == []


def test_unterminated_noise_is_bounded_and_does_not_poison_next_frame():
    framer = Framer(max_buffer=128)
    assert framer.feed(b'[' + b'x' * 4096) == []
    assert framer.issues
    received = framer.feed(b'[3G*2016001000*0005*VERNO]')
    assert received == [b'[3G*2016001000*0005*VERNO]']
    assert framer.finish() == []
