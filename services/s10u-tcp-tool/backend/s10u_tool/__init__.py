"""Manual-only local TCP workbench. Importing this package starts no network I/O."""


def create_app(*args, **kwargs):
    from .app import create_app as factory
    return factory(*args, **kwargs)
