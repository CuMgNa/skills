# -*- coding: utf-8 -*-
"""[兼容 shim] 旧 test_plan_material 接口 → 委托新 material_context。

旧实现已被 material_context.py 取代（健壮化、可多资料合并）。
本文件仅保留对外公开函数的签名，转调新引擎，避免历史调用方/文档失效。
新代码请直接 import material_context。
"""
import material_context as _mc
import report_config as _cfg

# 兼容旧的模块别名常量引用。
MODULE_ALIAS = _cfg.DEFAULT_MODULE_ALIAS


def parse_panorama_table(text):
    return _mc.parse_panorama_table(text)


def parse_panorama_table_legacy(text):
    rows, title, _kind, _reason = _mc.parse_panorama_table(text)
    return rows, title


def zentao_module_to_plan(zentao_mod):
    return _mc.zentao_module_to_plan(zentao_mod)


def render_parse_notice(reason):
    return _mc.render_parse_notice(reason)


def build_execution_rows(bs, panorama_rows):
    return _mc.build_execution_rows(bs, panorama_rows)


def build_simplified_rows(bs):
    return _mc.build_simplified_rows(bs)


def module_result_status(v):
    return _mc._module_result_status(v)


def module_remark(v):
    return _mc._module_remark(v)


def aggregate_plan_stats(bs, plan_module):
    agg = {"未关闭": 0, "已修复": 0, "延期": 0, "回归不通过": 0}
    for zentao_mod, v in bs.get("byModule", {}).items():
        if _mc.module_matches(zentao_mod, plan_module):
            for k in agg:
                agg[k] += v.get(k, 0)
    return agg


def load_material_file(path):
    return _mc.load_material_file(path)


def fetch_material_page(notion_client, page_id):
    return _mc.fetch_material_page(notion_client, page_id)
