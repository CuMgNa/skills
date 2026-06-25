# -*- coding: utf-8 -*-
"""报告生成集中配置（阈值 / 映射 / 词典 / 模块别名）。

设计目标（对应 v2 计划「阈值魔法数字」「severity↔级别映射」「多来源冲突 reconcile」）：
  1. 所有魔法数字、关键词词典、模块别名集中到此，支持 CLI / 项目级覆盖；
  2. 报告级别（一/二/三/四级）只来自 bugStats，severity 仅用于缺陷语义补充，不反向污染展示数字；
  3. 字段冲突按固定来源优先级 reconcile，并记录 conflicts。

通过 get_config(overrides) 取得最终配置：内置默认 ← 项目配置文件 ← CLI 覆盖。
"""
import copy
import json
from pathlib import Path


# ── 级别体系（展示级别只认 bugStats 的中文「级别」字段） ────────────
# bugStats 的「级别」来自禅道 pri（见 bugstats.py），这里仅做排序/风险权重。
LEVEL_RANK = {"一级": 4, "二级": 3, "三级": 2, "四级": 1}
LEVEL_RISK = {"一级": 3, "二级": 3, "三级": 2, "四级": 1}
LEVEL_ORDER = ["一级", "二级", "三级", "四级"]

# severity（禅道数值）→ 语义级别，仅供缺陷语义层参考，禁止写入展示数字。
SEVERITY_TO_LEVEL = {1: "一级", 2: "二级", 3: "三级", 4: "四级"}

# 字段级 reconcile 来源优先级（越靠前越权威）。
FIELD_SOURCE_PRIORITY = {
    # 展示级别：唯一权威是 bugStats，禁止被语义产物/禅道 severity 改写。
    "level": ["bugStats"],
    "status": ["bugStats"],
    "module": ["bugStats"],
    # 语义字段：优先用结构化持久化产物，其次禅道步骤，最后标题。
    "preconditions": ["semantic", "zentao_steps", "title"],
    "steps": ["semantic", "zentao_steps", "title"],
    "actual": ["semantic", "zentao_steps", "title"],
    "expected": ["semantic", "zentao_steps", "title"],
    "rootProblem": ["semantic", "zentao_steps", "title"],
    "userImpact": ["semantic", "zentao_steps", "title"],
    # severity 仅参考，不参与展示。
    "severity": ["zentao", "semantic"],
}

# 资料类型展示标签。
KIND_LABELS = {
    "test_plan":     "测试方案/计划",
    "logic_outline": "逻辑大纲",
    "prd":           "PRD/需求文档",
    "unknown":       "未识别类型",
}

# 默认阈值。
DEFAULT_THRESHOLDS = {
    # 重点问题：级别排序 >= 此 rank 必入选（二级及以上）。
    "key_issue_force_level_rank": LEVEL_RANK["二级"],
    # 动态方向成立的最小支撑缺陷数（不足且无高级别则并入「其他」）。
    "dynamic_label_min_support": 2,
    # 重点问题最多展示方向数。
    "key_issue_max_groups": 8,
    # 单方向最多列出缺陷数（超出折叠为「等 N 个」）。
    "key_issue_max_items_per_group": 6,
    # 覆盖率低于此值切「模块明细优先」模式（资料覆盖到的模块 / 总模块）。
    "coverage_min_ratio": 0.5,
    # 自动标签置信度低于此值标记 needsReview。
    "confidence_low": 0.6,
}

# impactSignals 词典：label → {keywords, phrase, weight}
# weight 用于重点问题方向排序；phrase 为「不可溯源时」可用的模板化影响短语。
DEFAULT_IMPACT_SIGNALS = [
    {
        "label": "资金/计费",
        "keywords": ["扣费", "扣减", "余额", "套餐", "计费", "欠费", "星豆", "充值",
                     "退款", "退还", "负值", "负数", "金额", "结算"],
        "phrase": "可能造成资金或计费数据错误，影响对账与用户权益",
        "weight": 100,
    },
    {
        "label": "权限/安全",
        "keywords": ["权限", "登录", "鉴权", "越权", "账号", "封禁", "拦截", "校验",
                     "必填", "上限", "重名"],
        "phrase": "权限或边界校验缺失，存在安全/越界风险",
        "weight": 90,
    },
    {
        "label": "数据一致性",
        "keywords": ["同步", "统计", "一致", "重复", "丢失", "未生成", "未更新",
                     "未刷新", "空白", "空态", "未扣减", "未对应", "误显示", "误减"],
        "phrase": "数据展示或同步不一致，可能误导业务判断",
        "weight": 80,
    },
    {
        "label": "消息/通信",
        "keywords": ["转发", "下行", "上行", "语音", "推送", "消息", "聊天室", "通信",
                     "对讲", "群聊"],
        "phrase": "消息收发链路异常，可能导致漏收/重复收",
        "weight": 70,
    },
    {
        "label": "界面/体验",
        "keywords": ["排版", "样式", "截断", "错位", "占位", "过窄", "UI", "原型",
                     "空白页", "折叠", "样式不一致"],
        "phrase": "界面体验问题，不影响核心功能但影响观感",
        "weight": 20,
    },
]

# 禅道【模块】前缀 → 测试方案规范模块名（一对一，可被项目配置覆盖/追加）。
DEFAULT_MODULE_ALIAS = [
    # SaaS1期 磐钴项目
    (["账号登录", "账号密码登录"], "🔐 登录与认证"),
    (["账号管理", "一级账号", "用户管理", "用户列表"], "👥 用户与账号体系"),
    (["设备管理", "设备列表", "设备详情", "设备入库"], "📦 设备与分组管理"),
    (["普通通信", "消息管理"], "💬 消息通信"),
    (["救援棒报警"], "🚨 SOS 报警与报平安"),
    (["求救群聊", "iOS求救群聊", "普通群聊"], "🆘 求救群聊"),
    (["套餐商城"], "💰 套餐与扣费"),
    (["电子围栏", "围栏报警记录"], "🗺️ 电子围栏"),
    (["停港逻辑", "WebSocket", "实时推送"], "📡 WebSocket 实时推送"),
    (["消息通知", "公众号通知", "设备订阅", "通知记录"], "🔔 订阅与通知推送"),
    (["控制台", "大屏监控", "关注监控平台"], "监控平台"),
    # 星联2期
    (["对讲群"], "🛰️ 对讲群通信"),
    (["群信息"], "🛰️ 对讲群通信"),
    (["群管理"], "🛰️ 对讲群通信"),
    (["通信消息"], "🛰️ 对讲群通信"),
    (["聊天消息"], "🛰️ 对讲群通信"),
    (["成员位置"], "🛰️ 对讲群通信"),
    (["星豆充值", "星豆明细", "星豆"], "💰 星豆与套餐"),
    (["套餐概览", "套餐明细", "套餐"], "💰 星豆与套餐"),
]


def _deep_merge(base, override):
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def get_config(project_config_path=None, cli_overrides=None):
    """返回最终配置 dict。

    合并顺序：内置默认 ← 项目配置文件(JSON) ← CLI 覆盖(dict)。
    项目配置文件结构（均可选）：
      {"thresholds": {...}, "impactSignals": [...], "moduleAlias": [[["前缀"],"规范名"], ...]}
    """
    cfg = {
        "thresholds": copy.deepcopy(DEFAULT_THRESHOLDS),
        "impactSignals": copy.deepcopy(DEFAULT_IMPACT_SIGNALS),
        "moduleAlias": copy.deepcopy(DEFAULT_MODULE_ALIAS),
        "levelRank": dict(LEVEL_RANK),
        "levelRisk": dict(LEVEL_RISK),
        "levelOrder": list(LEVEL_ORDER),
        "severityToLevel": dict(SEVERITY_TO_LEVEL),
        "fieldSourcePriority": copy.deepcopy(FIELD_SOURCE_PRIORITY),
        "kindLabels": dict(KIND_LABELS),
        "applied": {"projectConfig": None, "cli": bool(cli_overrides)},
    }

    if project_config_path:
        p = Path(project_config_path)
        if p.is_file():
            try:
                pc = json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:  # noqa: BLE001
                raise ValueError(f"项目配置解析失败 {p}: {e}") from e
            if "thresholds" in pc:
                cfg["thresholds"] = _deep_merge(cfg["thresholds"], pc["thresholds"])
            if "impactSignals" in pc:
                cfg["impactSignals"] = pc["impactSignals"]
            if "moduleAlias" in pc:
                # JSON 里是 [[["前缀1","前缀2"],"规范名"], ...]，转回 tuple 列表追加。
                extra = [(list(a[0]), a[1]) for a in pc["moduleAlias"]]
                cfg["moduleAlias"] = extra + cfg["moduleAlias"]
            cfg["applied"]["projectConfig"] = str(p)

    if cli_overrides:
        if "thresholds" in cli_overrides:
            cfg["thresholds"] = _deep_merge(cfg["thresholds"], cli_overrides["thresholds"])

    return cfg
