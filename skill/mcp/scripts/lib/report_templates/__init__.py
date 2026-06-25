# -*- coding: utf-8 -*-
"""报告模板注册表：按 --template 选择渲染器，按 --locale 选择文案。

每个模板需提供：
  build_notion_blocks(ctx, locale) -> list[block]
  build_dingtalk_summary(ctx, locale, doc_url, mention_line, title) -> str
"""
from report_templates import standard

_REGISTRY = {
    "standard": standard,
}

SUPPORTED_LOCALES = ["zh-CN", "en-US"]


def get_template(name="standard"):
    if name not in _REGISTRY:
        raise ValueError(f"未知模板 '{name}'，可用：{list(_REGISTRY)}")
    return _REGISTRY[name]


def list_templates():
    return list(_REGISTRY)
