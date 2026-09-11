"""Local-only entry point. Never uses a reloader or multiple workers."""
import argparse


def main(argv=None):
    parser = argparse.ArgumentParser(description="Manual-only S10U local TCP tool (one worker)")
    parser.add_argument("--host", choices=("127.0.0.1", "localhost", "::1"), default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--data-dir", default=None)
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    import uvicorn
    from .app import create_app
    app = create_app(data_dir=args.data_dir)
    uvicorn.run(app, host=args.host, port=args.port, workers=1, reload=False, proxy_headers=False, ws_max_size=4096, ws_max_queue=8)


if __name__ == "__main__":
    main()
