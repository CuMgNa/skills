/**
 * AI 应用先锋赛 — QA 提效助手 PPT（高管汇报版）
 * 视觉：极夜金 · 大留白 · 一页一结论
 */
const pptxgen = require("pptxgenjs");
const path = require("path");

// ── 极夜金 配色体系 ──
const C = {
  ink: "0A0F1C",
  navy: "0F1B33",
  navyMid: "1A2D4D",
  gold: "C9A84C",
  goldLight: "E8D5A3",
  goldDim: "8A7340",
  white: "FFFFFF",
  paper: "F8F9FB",
  paperAlt: "EEF1F6",
  text: "1C2333",
  body: "4A5568",
  muted: "8B95A8",
  line: "D8DEE8",
  teal: "0D9488",
  tealLight: "CCFBF1",
  red: "DC2626",
  redSoft: "FEE2E2",
  green: "059669",
  greenSoft: "D1FAE5",
};

const W = 10;
const H = 5.625;
const MX = 0.72;
const CONTENT_TOP = 1.55;
const FONT = "Microsoft YaHei";
const TOTAL = 20;

function shadow() {
  return { type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.1 };
}

function goldLine(slide, x, y, w) {
  slide.addShape("rect", {
    x, y, w, h: 0.03,
    fill: { color: C.gold }, line: { color: C.gold, width: 0 },
  });
}

function cornerAccent(slide, dark = false) {
  slide.addShape("rect", {
    x: W - 2.8, y: -0.5, w: 3.2, h: 3.2,
    fill: { color: dark ? C.navyMid : C.paperAlt, transparency: dark ? 70 : 0 },
    line: { color: dark ? C.navyMid : C.paperAlt, width: 0 },
    rotate: 25,
  });
}

function addSectionSlide(pres, num, title, subtitle) {
  const slide = pres.addSlide();
  slide.background = { color: C.ink };
  slide.addShape("rect", {
    x: 0, y: 0, w: W, h: 0.04,
    fill: { color: C.gold }, line: { color: C.gold, width: 0 },
  });
  slide.addText(num, {
    x: MX, y: 1.6, w: 2, h: 1.2,
    fontSize: 72, fontFace: FONT, color: C.goldDim, bold: true, margin: 0,
  });
  goldLine(slide, MX, 2.85, 1.6);
  slide.addText(title, {
    x: MX, y: 3.05, w: 8, h: 0.75,
    fontSize: 36, fontFace: FONT, color: C.white, bold: true, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MX, y: 3.85, w: 7.5, h: 0.45,
      fontSize: 14, fontFace: FONT, color: C.muted, margin: 0,
    });
  }
  slide.addText("AI 驱动的 QA 提效助手", {
    x: MX, y: H - 0.45, w: 5, h: 0.3,
    fontSize: 9, fontFace: FONT, color: C.goldDim, margin: 0,
  });
  return slide;
}

function addContentSlide(pres, section, title, subtitle, pageNum) {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  cornerAccent(slide);

  slide.addShape("rect", {
    x: 0, y: 0, w: W, h: 0.06,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  slide.addShape("rect", {
    x: 0, y: 0.06, w: 2.4, h: 0.04,
    fill: { color: C.gold }, line: { color: C.gold, width: 0 },
  });

  if (section) {
    slide.addText(section.toUpperCase(), {
      x: MX, y: 0.28, w: 3, h: 0.22,
      fontSize: 8, fontFace: FONT, color: C.gold, charSpacing: 2, margin: 0,
    });
  }
  slide.addText(title, {
    x: MX, y: 0.48, w: 8.2, h: 0.52,
    fontSize: 24, fontFace: FONT, color: C.text, bold: true, margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MX, y: 0.98, w: 8.2, h: 0.32,
      fontSize: 11, fontFace: FONT, color: C.muted, margin: 0,
    });
  }

  if (pageNum) {
    slide.addText(String(pageNum).padStart(2, "0"), {
      x: W - 1.1, y: 0.35, w: 0.6, h: 0.35,
      fontSize: 18, fontFace: FONT, color: C.line, bold: true, align: "right", margin: 0,
    });
  }
  return slide;
}

function addConclusionBar(slide, text, y = H - 0.78) {
  slide.addShape("rect", {
    x: MX, y, w: W - MX * 2, h: 0.52,
    fill: { color: C.navy }, line: { color: C.navy, width: 0 },
  });
  slide.addShape("rect", {
    x: MX, y, w: 0.05, h: 0.52,
    fill: { color: C.gold }, line: { color: C.gold, width: 0 },
  });
  slide.addText(text, {
    x: MX + 0.2, y: y + 0.1, w: W - MX * 2 - 0.35, h: 0.32,
    fontSize: 11, fontFace: FONT, color: C.goldLight, margin: 0,
  });
}

function kpiCard(slide, x, y, w, h, value, unit, label, accent) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
    shadow: shadow(),
  });
  slide.addShape("rect", {
    x, y, w, h: 0.05,
    fill: { color: accent || C.gold }, line: { color: accent || C.gold, width: 0 },
  });
  slide.addText(value, {
    x, y: y + 0.18, w, h: 0.65,
    fontSize: 32, fontFace: FONT, color: accent || C.navy, bold: true,
    align: "center", margin: 0,
  });
  if (unit) {
    slide.addText(unit, {
      x, y: y + 0.72, w, h: 0.25,
      fontSize: 10, fontFace: FONT, color: C.muted, align: "center", margin: 0,
    });
  }
  slide.addText(label, {
    x: x + 0.1, y: y + h - 0.42, w: w - 0.2, h: 0.35,
    fontSize: 9, fontFace: FONT, color: C.body, align: "center", margin: 0,
  });
}

function painCard(slide, x, y, w, h, icon, title, desc) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: C.white }, line: { color: C.line, width: 0.75 },
    shadow: shadow(),
  });
  slide.addText(icon, {
    x, y: y + 0.15, w, h: 0.4,
    fontSize: 22, align: "center", margin: 0,
  });
  slide.addText(title, {
    x: x + 0.12, y: y + 0.55, w: w - 0.24, h: 0.3,
    fontSize: 11, fontFace: FONT, color: C.text, bold: true, align: "center", margin: 0,
  });
  slide.addText(desc, {
    x: x + 0.12, y: y + 0.88, w: w - 0.24, h: h - 1.0,
    fontSize: 8.5, fontFace: FONT, color: C.muted, align: "center", margin: 0,
  });
}

function stepCard(slide, x, y, w, h, num, title, desc, highlight) {
  const bg = highlight ? C.navy : C.white;
  const fg = highlight ? C.white : C.text;
  const sub = highlight ? C.goldLight : C.muted;
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: bg }, line: { color: highlight ? C.navy : C.line, width: highlight ? 0 : 0.75 },
    shadow: highlight ? shadow() : undefined,
  });
  if (!highlight) {
    slide.addShape("rect", {
      x, y, w: 0.06, h,
      fill: { color: C.gold }, line: { color: C.gold, width: 0 },
    });
  }
  slide.addText(num, {
    x: x + 0.15, y: y + 0.12, w: 0.6, h: 0.35,
    fontSize: 20, fontFace: FONT, color: highlight ? C.gold : C.goldDim, bold: true, margin: 0,
  });
  slide.addText(title, {
    x: x + 0.15, y: y + 0.48, w: w - 0.3, h: 0.32,
    fontSize: 11, fontFace: FONT, color: fg, bold: true, margin: 0,
  });
  slide.addText(desc, {
    x: x + 0.15, y: y + 0.82, w: w - 0.3, h: h - 0.95,
    fontSize: 8.5, fontFace: FONT, color: sub, margin: 0,
  });
}

function compareBar(slide, y, label, before, after, pct, good = true) {
  const barH = 0.55;
  slide.addText(label, {
    x: MX, y, w: 1.6, h: barH,
    fontSize: 9, fontFace: FONT, color: C.text, bold: true, valign: "middle", margin: 0,
  });
  slide.addShape("rect", {
    x: 2.4, y: y + 0.08, w: 2.8, h: 0.38,
    fill: { color: C.redSoft }, line: { color: C.line, width: 0.5 },
  });
  slide.addText(before, {
    x: 2.4, y: y + 0.1, w: 2.8, h: 0.34,
    fontSize: 9, fontFace: FONT, color: C.red, align: "center", valign: "middle", margin: 0,
  });
  slide.addText("→", {
    x: 5.3, y: y + 0.05, w: 0.4, h: 0.4,
    fontSize: 16, color: C.gold, align: "center", margin: 0,
  });
  slide.addShape("rect", {
    x: 5.8, y: y + 0.08, w: 2.8, h: 0.38,
    fill: { color: C.greenSoft }, line: { color: C.line, width: 0.5 },
  });
  slide.addText(after, {
    x: 5.8, y: y + 0.1, w: 2.8, h: 0.34,
    fontSize: 9, fontFace: FONT, color: C.green, align: "center", valign: "middle", margin: 0,
  });
  slide.addShape("rect", {
    x: 8.75, y: y + 0.08, w: 0.85, h: 0.38,
    fill: { color: good ? C.teal : C.paperAlt },
    line: { color: good ? C.teal : C.line, width: 0 },
  });
  slide.addText(pct, {
    x: 8.75, y: y + 0.1, w: 0.85, h: 0.34,
    fontSize: 8, fontFace: FONT, color: good ? C.white : C.body,
    bold: true, align: "center", valign: "middle", margin: 0,
  });
}

function pipelineNode(slide, x, y, w, title, sub, active) {
  slide.addShape("rect", {
    x, y, w, h: 0.95,
    fill: { color: active ? C.navy : C.paper },
    line: { color: active ? C.gold : C.line, width: active ? 1.5 : 0.5 },
    shadow: active ? shadow() : undefined,
  });
  slide.addText(title, {
    x, y: y + 0.12, w, h: 0.32,
    fontSize: 8.5, fontFace: FONT,
    color: active ? C.white : C.text,
    bold: true, align: "center", margin: 0,
  });
  slide.addText(sub, {
    x, y: y + 0.48, w, h: 0.35,
    fontSize: 7, fontFace: FONT,
    color: active ? C.goldLight : C.muted,
    align: "center", margin: 0,
  });
}

function imgPlaceholder(slide, x, y, w, h, label) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: C.paper }, line: { color: C.line, width: 1 },
  });
  slide.addShape("rect", {
    x: x + 0.08, y: y + 0.08, w: w - 0.16, h: h - 0.16,
    fill: { color: C.white }, line: { color: C.line, width: 0.5, dashType: "dash" },
  });
  slide.addText(label, {
    x, y: y + h / 2 - 0.15, w, h: 0.3,
    fontSize: 8.5, fontFace: FONT, color: C.muted, align: "center", margin: 0,
  });
}

function build() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "童美娜";
  pres.title = "AI 驱动的 QA 提效助手";
  pres.subject = "AI 应用先锋赛";

  let page = 0;

  // ═══ 1. 封面 ═══
  {
    const slide = pres.addSlide();
    slide.background = { color: C.ink };
    slide.addShape("rect", {
      x: 0, y: 0, w: W, h: H,
      fill: { color: C.navyMid, transparency: 60 },
      line: { color: C.navyMid, width: 0 },
    });
    slide.addShape("rect", {
      x: -0.5, y: 3.8, w: 6, h: 6,
      fill: { color: C.gold, transparency: 92 },
      line: { color: C.gold, width: 0 },
      rotate: -15,
    });
    goldLine(slide, MX, 1.35, 1.2);
    slide.addText("AI 应用先锋赛", {
      x: MX, y: 1.55, w: 4, h: 0.3,
      fontSize: 11, fontFace: FONT, color: C.gold, charSpacing: 3, margin: 0,
    });
    slide.addText("让 QA 回归质量本职", {
      x: MX, y: 2.0, w: 8.5, h: 0.9,
      fontSize: 40, fontFace: FONT, color: C.white, bold: true, margin: 0,
    });
    slide.addText("AI 驱动的 QA 提效助手", {
      x: MX, y: 2.95, w: 8, h: 0.45,
      fontSize: 18, fontFace: FONT, color: C.goldLight, margin: 0,
    });
    slide.addText("需求进 · 报告出 · 全链路智能提效", {
      x: MX, y: 3.55, w: 8, h: 0.35,
      fontSize: 13, fontFace: FONT, color: C.muted, margin: 0,
    });
    slide.addShape("line", {
      x: MX, y: 4.35, w: 3.5, h: 0,
      line: { color: C.goldDim, width: 0.5 },
    });
    slide.addText("童美娜  |  软件部  |  测试工程师  |  2026.03", {
      x: MX, y: 4.55, w: 8, h: 0.35,
      fontSize: 11, fontFace: FONT, color: C.muted, margin: 0,
    });
  }

  // ═══ 2. 章节：挑战 ═══
  addSectionSlide(pres, "01", "挑战", "QA 的时间，不该耗在表格上");

  // ═══ 3. 核心痛点 ═══
  {
    page = 3;
    const slide = addContentSlide(pres, "挑战", "测试员成了「文员」，而非「质检员」",
      "每个迭代，大量工时耗在文书事务，而非质量分析与风险把控", page);

    slide.addShape("rect", {
      x: MX, y: CONTENT_TOP, w: W - MX * 2, h: 0.72,
      fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
    });
    slide.addText("「写用例 → 填禅道 → 写报告 → 发钉钉」—— 重复劳动挤占了真正有价值的测试时间", {
      x: MX + 0.2, y: CONTENT_TOP + 0.15, w: W - MX * 2 - 0.4, h: 0.45,
      fontSize: 12, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });

    const pains = [
      ["📝", "用例设计", "手工逐条编写\n覆盖靠经验，边界易漏"],
      ["🐛", "缺陷登记", "单条 3～5 分钟\n一轮几十条，反复手填"],
      ["📊", "测试报告", "禅道导出整理\n单份 2～3 小时"],
      ["📢", "团队同步", "多端摘抄粘贴\n时效差、版本乱"],
    ];
    const cw = 2.05;
    const gap = 0.18;
    pains.forEach((p, i) => {
      painCard(slide, MX + i * (cw + gap), 2.5, cw, 2.15, p[0], p[1], p[2]);
    });

    addConclusionBar(slide, "问题不在「会不会测」，而在测前写用例、测后填表格的低价值重复");
  }

  // ═══ 4. 传统链路 ═══
  {
    page = 4;
    const slide = addContentSlide(pres, "挑战", "传统 QA 链路：长、慢、重复",
      "单迭代必经流程，每一步都在消耗测试精力", page);

    const steps = [
      "读需求\n写用例", "执行\n测试", "发现\nBug", "手工\n填禅道",
      "导出\n整理", "撰写\n报告", "复制\n钉钉",
    ];
    const sw = 1.15;
    const startX = 0.42;
    steps.forEach((s, i) => {
      const x = startX + i * (sw + 0.2);
      const isHot = i === 0 || i === 3 || i === 5;
      slide.addShape("rect", {
        x, y: 1.75, w: sw, h: 0.9,
        fill: { color: isHot ? C.redSoft : C.paper },
        line: { color: isHot ? C.red : C.line, width: isHot ? 1 : 0.5 },
      });
      slide.addText(s, {
        x, y: 1.85, w: sw, h: 0.7,
        fontSize: 8.5, fontFace: FONT, color: isHot ? C.red : C.body,
        align: "center", valign: "middle", margin: 0,
      });
      if (i < steps.length - 1) {
        slide.addText("›", {
          x: x + sw - 0.02, y: 2.0, w: 0.22, h: 0.35,
          fontSize: 14, color: C.goldDim, align: "center", margin: 0,
        });
      }
    });

    kpiCard(slide, MX, 3.05, 2.05, 1.35, "1～2天", "", "中等模块用例编写", C.red);
    kpiCard(slide, MX + 2.23, 3.05, 2.05, 1.35, "3～5分", "/ 条", "禅道缺陷录入", C.red);
    kpiCard(slide, MX + 4.46, 3.05, 2.05, 1.35, "2～3h", "/ 份", "测试报告撰写", C.red);
    kpiCard(slide, MX + 6.69, 3.05, 2.05, 1.35, "每迭代", "必做", "重复性事务劳动", C.navy);

    addConclusionBar(slide, "中等功能模块 20+ 测试点，一轮测试动辄几十条缺陷 —— 文书成本远超测试本身");
  }

  // ═══ 5. ROI ═══
  {
    page = 5;
    const slide = addContentSlide(pres, "挑战", "千元投入，换回百余小时",
      "把「提效」翻译成领导听得懂的时间与 ROI", page);

    compareBar(slide, 1.65, "用例编写", "手工 1～2 天", "AI 半天内", "↓70%");
    compareBar(slide, 2.35, "缺陷录入", "3～5 分钟", "≤30 秒", "↓90%");
    compareBar(slide, 3.05, "测试报告", "2～3 小时", "≤20 分钟", "↑80%");
    compareBar(slide, 3.75, "登记完整率", "靠人工记忆", "≥95%", "结构化");

    slide.addShape("rect", {
      x: MX, y: 4.45, w: W - MX * 2, h: 0.72,
      fill: { color: C.navy }, line: { color: C.navy, width: 0 },
    });
    slide.addText([
      { text: "年投入 ", options: { fontSize: 11, color: C.muted } },
      { text: "¥1,380", options: { fontSize: 20, color: C.gold, bold: true } },
      { text: "        年产出 ", options: { fontSize: 11, color: C.muted } },
      { text: "144～192 小时", options: { fontSize: 20, color: C.white, bold: true } },
      { text: "        每迭代节省 ", options: { fontSize: 11, color: C.muted } },
      { text: "6～8 小时+", options: { fontSize: 20, color: C.tealLight, bold: true } },
    ], {
      x: MX + 0.15, y: 4.55, w: W - MX * 2 - 0.3, h: 0.52,
      fontFace: FONT, align: "center", valign: "middle", margin: 0,
    });
  }

  // ═══ 6. 章节：方案 ═══
  addSectionSlide(pres, "02", "方案", "一条流水线，覆盖 QA 全生命周期");

  // ═══ 7. 方案总览 ═══
  {
    page = 7;
    const slide = addContentSlide(pres, "方案", "需求进，报告出",
      "AI 串联写用例 → 执行测试 → 登记缺陷 → 汇总报告 → 团队同步", page);

    const nodes = [
      ["需求输入", "计划 & 需求", false],
      ["AI 写用例", "testcase-gen", true],
      ["人工测试", "执行验证", false],
      ["Agent 1", "截图提缺陷", true],
      ["禅道", "缺陷数据源", false],
      ["Agent 2", "自动出报告", true],
      ["钉钉推送", "团队触达", true],
    ];
    const nw = 1.18;
    nodes.forEach((n, i) => {
      pipelineNode(slide, 0.35 + i * (nw + 0.14), 1.7, nw, n[0], n[1], n[2]);
      if (i < nodes.length - 1) {
        slide.addText("›", {
          x: 0.35 + i * (nw + 0.14) + nw - 0.02, y: 1.95, w: 0.16, h: 0.3,
          fontSize: 12, color: C.gold, align: "center", margin: 0,
        });
      }
    });

    const tech = [
      ["Cursor", "AI 编程环境，承载技能知识库"],
      ["Skills", "QA 经验固化为可复用 SOP"],
      ["MCP", "对接禅道 · 钉钉 · Notion，AI 能动手"],
      ["WorkBuddy", "定时触发，无人值守质量播报"],
    ];
    tech.forEach((t, i) => {
      const y = 3.0 + i * 0.58;
      slide.addShape("rect", {
        x: MX, y, w: 1.35, h: 0.44,
        fill: { color: C.gold }, line: { color: C.gold, width: 0 },
      });
      slide.addText(t[0], {
        x: MX, y: y + 0.08, w: 1.35, h: 0.28,
        fontSize: 9, fontFace: FONT, color: C.ink, bold: true, align: "center", margin: 0,
      });
      slide.addText(t[1], {
        x: MX + 1.55, y: y + 0.1, w: 7.2, h: 0.28,
        fontSize: 10, fontFace: FONT, color: C.body, margin: 0,
      });
    });

    addConclusionBar(slide, "不是单点工具，而是可编排、可复用、可扩展的 QA 智能流水线");
  }

  // ═══ 8. 写用例 ═══
  {
    page = 8;
    const slide = addContentSlide(pres, "方案", "测试基本功，写进 AI",
      "等价类 + 边界值方法论自动化，人只做审核把关", page);

    const steps = [
      ["01", "输入", "测试计划 plan.md\n+ 澄清后需求文档"],
      ["02", "触发", "/testcase-gen\n按测试点分批生成"],
      ["03", "方法论", "等价类划分\n边界值自动覆盖"],
      ["04", "质量闸门", "validate.py 校验\n合并导出 · 人工审核"],
    ];
    steps.forEach((s, i) => {
      stepCard(slide, MX + i * 2.18, 1.65, 2.0, 2.35, s[0], s[1], s[2], i === 3);
    });

    slide.addShape("rect", {
      x: MX, y: 4.2, w: W - MX * 2, h: 0.55,
      fill: { color: C.tealLight }, line: { color: C.teal, width: 0.5 },
    });
    slide.addText([
      { text: "实测产出  ", options: { bold: true, color: C.teal } },
      { text: "8 测试项 · 20 测试点 → 75 条用例  |  有效等价类 100%  |  异常覆盖 80%  |  边界值 90%", options: { color: C.body } },
    ], {
      x: MX + 0.15, y: 4.3, w: W - MX * 2 - 0.3, h: 0.35,
      fontSize: 9.5, fontFace: FONT, margin: 0,
    });
  }

  // ═══ 9. Agent1 ═══
  {
    page = 9;
    const slide = addContentSlide(pres, "方案", "Agent 1 · 截图即登记",
      "缺陷录入 3～5 分钟 → 30 秒以内", page);

    const flow = ["上传缺陷截图", "AI 结构化 8 块字段", "人工确认", "一键写入禅道"];
    flow.forEach((f, i) => {
      const y = 1.7 + i * 0.62;
      slide.addShape("oval", {
        x: MX, y: y + 0.04, w: 0.42, h: 0.42,
        fill: { color: C.gold }, line: { color: C.gold, width: 0 },
      });
      slide.addText(String(i + 1), {
        x: MX, y: y + 0.07, w: 0.42, h: 0.36,
        fontSize: 13, color: C.ink, bold: true, align: "center", margin: 0,
      });
      slide.addText(f, {
        x: MX + 0.58, y: y + 0.08, w: 3.5, h: 0.35,
        fontSize: 12, fontFace: FONT, color: C.text, margin: 0,
      });
      if (i < flow.length - 1) {
        slide.addShape("line", {
          x: MX + 0.2, y: y + 0.5, w: 0, h: 0.18,
          line: { color: C.line, width: 1, dashType: "dash" },
        });
      }
    });

    slide.addShape("rect", {
      x: 5.2, y: 1.6, w: 4.1, h: 3.55,
      fill: { color: C.paper }, line: { color: C.line, width: 0.75 },
      shadow: shadow(),
    });
    slide.addText("8 块标准字段", {
      x: 5.4, y: 1.75, w: 3.7, h: 0.3,
      fontSize: 11, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });
    const fields = ["标题", "复现步骤", "预期结果", "实际结果", "严重程度", "优先级", "模块", "环境"];
    fields.forEach((f, i) => {
      slide.addShape("rect", {
        x: 5.45 + (i % 2) * 1.9, y: 2.2 + Math.floor(i / 2) * 0.52, w: 1.75, h: 0.38,
        fill: { color: C.white }, line: { color: C.line, width: 0.5 },
      });
      slide.addText(f, {
        x: 5.45 + (i % 2) * 1.9, y: 2.25 + Math.floor(i / 2) * 0.52, w: 1.75, h: 0.28,
        fontSize: 9, fontFace: FONT, color: C.body, align: "center", margin: 0,
      });
    });
    imgPlaceholder(slide, 5.4, 4.15, 3.7, 0.85, "配图：Cursor 对话 + 禅道 Bug 页");
  }

  // ═══ 10. Agent2 ═══
  {
    page = 10;
    const slide = addContentSlide(pres, "方案", "Agent 2 · 一键出报告",
      "测试报告 2～3 小时 → 20 分钟以内", page);

    const steps = [
      ["①", "拉取禅道缺陷", "支持「仅未关闭」筛选"],
      ["②", "AI 生成三节报告", "测试结果 / 未解决 / 缺陷附件"],
      ["③", "写入钉钉文档", "测试报告文件夹归档"],
      ["④", "群机器人推送", "@负责人 + 关键摘要"],
    ];
    steps.forEach((s, i) => {
      const y = 1.65 + i * 0.72;
      slide.addShape("rect", {
        x: MX, y, w: 0.5, h: 0.5,
        fill: { color: C.navy }, line: { color: C.navy, width: 0 },
      });
      slide.addText(s[0], {
        x: MX, y: y + 0.06, w: 0.5, h: 0.38,
        fontSize: 14, color: C.gold, bold: true, align: "center", margin: 0,
      });
      slide.addText(s[1], {
        x: MX + 0.65, y: y + 0.02, w: 3.8, h: 0.28,
        fontSize: 11, fontFace: FONT, color: C.text, bold: true, margin: 0,
      });
      slide.addText(s[2], {
        x: MX + 0.65, y: y + 0.3, w: 3.8, h: 0.25,
        fontSize: 8.5, fontFace: FONT, color: C.muted, margin: 0,
      });
    });

    slide.addShape("rect", {
      x: 5.1, y: 1.6, w: 4.2, h: 3.6,
      fill: { color: C.navy }, line: { color: C.navy, width: 0 },
      shadow: shadow(),
    });
    slide.addText("实测案例", {
      x: 5.35, y: 1.78, w: 3.7, h: 0.28,
      fontSize: 10, fontFace: FONT, color: C.gold, bold: true, margin: 0,
    });
    goldLine(slide, 5.35, 2.1, 1.0);
    slide.addText([
      { text: "磐钴 · 位置监控平台-国际化", options: { fontSize: 11, color: C.white, bold: true, breakLine: true } },
      { text: "", options: { fontSize: 6, breakLine: true } },
      { text: "2026-06-11  自动汇总 19 条缺陷", options: { fontSize: 10, color: C.goldLight, breakLine: true } },
      { text: "5 条未解决  +  14 条待回归", options: { fontSize: 10, color: C.goldLight, breakLine: true } },
      { text: "三节报告一次生成，钉钉即时推送", options: { fontSize: 10, color: C.muted, breakLine: true } },
    ], {
      x: 5.35, y: 2.25, w: 3.7, h: 2.0,
      fontFace: FONT, margin: 0,
    });
    imgPlaceholder(slide, 5.35, 4.2, 3.7, 0.85, "配图：报告 MD + 钉钉文档 + 群推送");
  }

  // ═══ 11. 双 Agent + Skills ═══
  {
    page = 11;
    const slide = addContentSlide(pres, "方案", "双 Agent 分工 · Skills 沉淀",
      "职责清晰，可独立使用，可串行全流程", page);

    slide.addShape("rect", {
      x: MX, y: 1.65, w: 4.15, h: 2.55,
      fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
    });
    slide.addText("双 Agent 架构", {
      x: MX + 0.15, y: 1.78, w: 3.8, h: 0.28,
      fontSize: 11, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });
    const agents = [
      ["Agent 1", "截图识别 → 写禅道", "不写报告"],
      ["Agent 2", "拉缺陷 → 出报告 → 推钉钉", "不新建 Bug"],
      ["Orchestrator", "串行调度 + handoff 交接", "全流程一键串联"],
    ];
    agents.forEach((a, i) => {
      const y = 2.15 + i * 0.68;
      slide.addShape("rect", {
        x: MX + 0.12, y, w: 0.06, h: 0.55,
        fill: { color: C.gold }, line: { color: C.gold, width: 0 },
      });
      slide.addText(a[0], {
        x: MX + 0.28, y: y + 0.02, w: 1.5, h: 0.25,
        fontSize: 9.5, fontFace: FONT, color: C.text, bold: true, margin: 0,
      });
      slide.addText(a[1], {
        x: MX + 0.28, y: y + 0.28, w: 3.6, h: 0.22,
        fontSize: 8.5, fontFace: FONT, color: C.body, margin: 0,
      });
      slide.addText("✕ " + a[2], {
        x: MX + 0.28, y: y + 0.48, w: 3.6, h: 0.2,
        fontSize: 7.5, fontFace: FONT, color: C.muted, italic: true, margin: 0,
      });
    });

    slide.addShape("rect", {
      x: 5.15, y: 1.65, w: 4.15, h: 2.55,
      fill: { color: C.white }, line: { color: C.line, width: 0.5 },
      shadow: shadow(),
    });
    slide.addText("Skills 技能积木", {
      x: 5.3, y: 1.78, w: 3.8, h: 0.28,
      fontSize: 11, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });
    const layers = [
      ["测试设计", "testcase-generator"],
      ["流程编排", "qa-orchestrator"],
      ["Agent 层", "defect-intake / report-publish"],
      ["集成层", "zentao · dingtalk · notion"],
      ["执行层", "validate · pipeline · bug-create"],
    ];
    layers.forEach((l, i) => {
      const y = 2.12 + i * 0.42;
      const bw = 3.8 - i * 0.35;
      slide.addShape("rect", {
        x: 5.3 + i * 0.12, y, w: bw, h: 0.34,
        fill: { color: i === 0 ? C.navy : C.paper },
        line: { color: i === 0 ? C.gold : C.line, width: 0.5 },
      });
      slide.addText(`${l[0]}  ·  ${l[1]}`, {
        x: 5.3 + i * 0.12 + 0.1, y: y + 0.06, w: bw - 0.2, h: 0.22,
        fontSize: 7.5, fontFace: FONT,
        color: i === 0 ? C.goldLight : C.body, margin: 0,
      });
    });

    addConclusionBar(slide, "经验写成 Skills，换项目改配置即可复用 —— 不是每次从零 prompt");
  }

  // ═══ 12. 章节：实践 ═══
  addSectionSlide(pres, "03", "实践", "踩过的坑，都变成了可复用的技能");

  // ═══ 13. 实施路径 ═══
  {
    page = 13;
    const slide = addContentSlide(pres, "实践", "四阶段迭代落地",
      "从单点突破到全流程闭环，步步可验证", page);

    const phases = [
      ["0", "测试设计", "等价类/边界值 + 分批生成 + 校验脚本", "testcase-generator"],
      ["1", "单点突破", "截图提 Bug + 禅道自动写入", "defect-screenshot-bug-ticket"],
      ["2", "报告自动化", "禅道拉取 + 报告模板 + 钉钉推送", "test-report / dingtalk"],
      ["3", "编排闭环", "双 Agent + handoff + 一键 pipeline", "qa-orchestrator"],
    ];
    phases.forEach((p, i) => {
      const y = 1.62 + i * 0.82;
      slide.addShape("oval", {
        x: MX, y: y + 0.08, w: 0.55, h: 0.55,
        fill: { color: i === 3 ? C.gold : C.navy }, line: { color: i === 3 ? C.gold : C.navy, width: 0 },
      });
      slide.addText(p[0], {
        x: MX, y: y + 0.14, w: 0.55, h: 0.42,
        fontSize: 16, fontFace: FONT, color: i === 3 ? C.ink : C.white, bold: true, align: "center", margin: 0,
      });
      if (i < phases.length - 1) {
        slide.addShape("line", {
          x: MX + 0.27, y: y + 0.65, w: 0, h: 0.22,
          line: { color: C.line, width: 1.5 },
        });
      }
      slide.addText(`阶段 ${p[0]}  ·  ${p[1]}`, {
        x: MX + 0.72, y: y + 0.02, w: 4, h: 0.28,
        fontSize: 11, fontFace: FONT, color: C.text, bold: true, margin: 0,
      });
      slide.addText(p[2], {
        x: MX + 0.72, y: y + 0.32, w: 4.5, h: 0.28,
        fontSize: 8.5, fontFace: FONT, color: C.muted, margin: 0,
      });
      slide.addShape("rect", {
        x: 6.5, y: y + 0.1, w: 2.8, h: 0.48,
        fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
      });
      slide.addText(p[3], {
        x: 6.5, y: y + 0.18, w: 2.8, h: 0.32,
        fontSize: 7.5, fontFace: FONT, color: C.teal, align: "center", margin: 0,
      });
    });

    slide.addText("工具栈：Cursor（技能开发调试）+ MiniMax Coding Plan（辅助编码）", {
      x: MX, y: 5.05, w: 8, h: 0.25,
      fontSize: 8.5, fontFace: FONT, color: C.muted, margin: 0,
    });
  }

  // ═══ 14. 问题与解决 ═══
  {
    page = 14;
    const slide = addContentSlide(pres, "实践", "真实踩坑，技能迭代",
      "不是一次做对，而是把经验固化下来", page);

    const issues = [
      ["用例数据模糊", "固化具体数据规范 + validate.py 拦截"],
      ["生成冗余过多", "按 POINT 分批 + 等价类去重"],
      ["红框识别跑偏", "红框 > 红箭头 > 红字 优先级"],
      ["禅道格式混乱", "统一序号 + 真实换行规范"],
      ["报告超长失败", "分块 append，推送与正文分离"],
      ["流程中断难恢复", "handoff 契约 + 分级失败策略"],
    ];
    issues.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MX + col * 4.35;
      const y = 1.62 + row * 1.05;
      slide.addShape("rect", {
        x, y, w: 4.1, h: 0.88,
        fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
      });
      slide.addText("问题", {
        x: x + 0.12, y: y + 0.08, w: 0.6, h: 0.2,
        fontSize: 7, fontFace: FONT, color: C.red, bold: true, margin: 0,
      });
      slide.addText(item[0], {
        x: x + 0.12, y: y + 0.24, w: 3.8, h: 0.25,
        fontSize: 9.5, fontFace: FONT, color: C.text, bold: true, margin: 0,
      });
      slide.addText("→  " + item[1], {
        x: x + 0.12, y: y + 0.52, w: 3.85, h: 0.3,
        fontSize: 8, fontFace: FONT, color: C.body, margin: 0,
      });
    });
  }

  // ═══ 15. 人机协作 ═══
  {
    page = 15;
    const slide = addContentSlide(pres, "实践", "AI 辅助，人做确认",
      "建立信任的安全设计 —— 关键决策始终在人", page);

    const trusts = [
      ["用例生成", "人工审核后执行\nAI 不替代测试判断"],
      ["Bug 写入", "用户确认 8 块内容\n才写入禅道"],
      ["报告结论", "基于禅道真实数据\n非凭空编造"],
      ["幂等去重", "同日同标题 Bug\n自动拦截重复"],
    ];
    trusts.forEach((t, i) => {
      const x = MX + (i % 2) * 4.35;
      const y = 1.65 + Math.floor(i / 2) * 1.55;
      slide.addShape("rect", {
        x, y, w: 4.1, h: 1.35,
        fill: { color: C.white }, line: { color: C.line, width: 0.75 },
        shadow: shadow(),
      });
      slide.addShape("rect", {
        x, y, w: 4.1, h: 0.06,
        fill: { color: C.gold }, line: { color: C.gold, width: 0 },
      });
      slide.addText(t[0], {
        x: x + 0.15, y: y + 0.2, w: 3.8, h: 0.3,
        fontSize: 13, fontFace: FONT, color: C.navy, bold: true, margin: 0,
      });
      slide.addText(t[1], {
        x: x + 0.15, y: y + 0.58, w: 3.8, h: 0.65,
        fontSize: 9.5, fontFace: FONT, color: C.body, margin: 0,
      });
    });

    slide.addShape("rect", {
      x: MX, y: 4.75, w: W - MX * 2, h: 0.55,
      fill: { color: C.navy }, line: { color: C.navy, width: 0 },
    });
    slide.addText("AI 干重复活，人把关关键决策", {
      x: MX, y: 4.85, w: W - MX * 2, h: 0.35,
      fontSize: 14, fontFace: FONT, color: C.gold, bold: true, align: "center", margin: 0,
    });
  }

  // ═══ 16. 章节：成效 ═══
  addSectionSlide(pres, "04", "成效", "用数据说话，用案例证明");

  // ═══ 17. 数据对比 ═══
  {
    page = 17;
    const slide = addContentSlide(pres, "成效", "核心指标：前后对比",
      "可量化、可复现、可推广", page);

    const metrics = [
      ["用例编写", "1～2 天", "半天内", "↓70%", 0.85],
      ["缺陷录入", "3～5 分钟", "≤30 秒", "↓90%", 0.15],
      ["测试报告", "2～3 小时", "≤20 分钟", "↑80%", 0.2],
      ["迭代节省", "—", "6～8 小时+", "可量化", 0.65],
    ];
    metrics.forEach((m, i) => {
      const y = 1.65 + i * 0.72;
      slide.addText(m[0], {
        x: MX, y: y + 0.05, w: 1.3, h: 0.35,
        fontSize: 10, fontFace: FONT, color: C.text, bold: true, margin: 0,
      });
      slide.addText(m[1], {
        x: 2.0, y: y + 0.05, w: 1.5, h: 0.35,
        fontSize: 9, fontFace: FONT, color: C.red, align: "center", margin: 0,
      });
      slide.addShape("rect", {
        x: 3.7, y: y + 0.12, w: 4.5 * m[4], h: 0.28,
        fill: { color: C.teal }, line: { color: C.teal, width: 0 },
      });
      slide.addShape("rect", {
        x: 3.7 + 4.5 * m[4], y: y + 0.12, w: 4.5 * (1 - m[4]), h: 0.28,
        fill: { color: C.paperAlt }, line: { color: C.line, width: 0.5 },
      });
      slide.addText(m[2], {
        x: 3.7, y: y + 0.05, w: 4.5, h: 0.35,
        fontSize: 9, fontFace: FONT, color: C.navy, bold: true, align: "center", margin: 0,
      });
      slide.addShape("rect", {
        x: 8.4, y: y + 0.08, w: 0.95, h: 0.35,
        fill: { color: C.gold }, line: { color: C.gold, width: 0 },
      });
      slide.addText(m[3], {
        x: 8.4, y: y + 0.1, w: 0.95, h: 0.3,
        fontSize: 8, fontFace: FONT, color: C.ink, bold: true, align: "center", margin: 0,
      });
    });

    slide.addText("辅证：8 测试项 · 20 测试点 → 75 条用例  |  位置监控平台-国际化 19 条缺陷实测汇总", {
      x: MX, y: 4.75, w: W - MX * 2, h: 0.3,
      fontSize: 8.5, fontFace: FONT, color: C.muted, italic: true, margin: 0,
    });
  }

  // ═══ 18. 效果展示 ═══
  {
    page = 18;
    const slide = addContentSlide(pres, "成效", "全链路成果一览",
      "从写用例到群通知，原来半天，现在约 20 分钟", page);

    const shots = [
      "用例汇总", "校验通过", "禅道缺陷",
      "AI 报告", "钉钉文档", "群推送",
    ];
    shots.forEach((s, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MX + col * 2.95;
      const y = 1.62 + row * 1.75;
      imgPlaceholder(slide, x, y, 2.75, 1.55, "截图：" + s);
    });
  }

  // ═══ 19. 推广与规划 ═══
  {
    page = 19;
    const slide = addContentSlide(pres, "展望", "复制推广 · 持续演进", "", page);

    slide.addShape("rect", {
      x: MX, y: 1.55, w: 4.1, h: 3.55,
      fill: { color: C.paper }, line: { color: C.line, width: 0.5 },
    });
    slide.addText("团队复制路径", {
      x: MX + 0.15, y: 1.68, w: 3.8, h: 0.3,
      fontSize: 12, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });
    const promos = [
      "换 projectName / plan.md 即可适配新项目",
      "分阶段接入：写用例 → 提 Bug → 出报告",
      "30 分钟培训即可上手全流程",
      "建议：各部门 QA 各选 1 项目试跑 1 迭代",
    ];
    promos.forEach((p, i) => {
      slide.addText(p, {
        x: MX + 0.15, y: 2.1 + i * 0.55, w: 3.8, h: 0.45,
        fontSize: 9, fontFace: FONT, color: C.body, bullet: true, margin: 0,
      });
    });

    slide.addShape("rect", {
      x: 5.15, y: 1.55, w: 4.15, h: 3.55,
      fill: { color: C.white }, line: { color: C.line, width: 0.5 },
      shadow: shadow(),
    });
    slide.addText("后续 3 个月", {
      x: 5.3, y: 1.68, w: 3.8, h: 0.3,
      fontSize: 12, fontFace: FONT, color: C.navy, bold: true, margin: 0,
    });
    const plans = [
      "用例执行结果与缺陷截图一键关联",
      "多项目并行，沉淀配置模板",
      "API 自动化测试 skill 联动",
      "WorkBuddy 定时无人值守质量播报",
    ];
    plans.forEach((p, i) => {
      slide.addText(p, {
        x: 5.3, y: 2.1 + i * 0.55, w: 3.8, h: 0.45,
        fontSize: 9, fontFace: FONT, color: C.body, bullet: true, margin: 0,
      });
    });

    slide.addShape("rect", {
      x: MX, y: 5.15, w: W - MX * 2, h: 0.38,
      fill: { color: C.tealLight }, line: { color: C.teal, width: 0 },
    });
    slide.addText("年度投入 ¥1,380（Cursor ¥400 + Coding Plan ¥980）  |  风险应对：人工确认闸门 · MCP 独立维护 · 敏感配置不入库", {
      x: MX + 0.1, y: 5.2, w: W - MX * 2 - 0.2, h: 0.28,
      fontSize: 8, fontFace: FONT, color: C.teal, margin: 0,
    });
  }

  // ═══ 20. 封底 ═══
  {
    const slide = pres.addSlide();
    slide.background = { color: C.ink };
    slide.addShape("rect", {
      x: 0, y: H - 0.04, w: W, h: 0.04,
      fill: { color: C.gold }, line: { color: C.gold, width: 0 },
    });
    slide.addShape("rect", {
      x: 3.5, y: 0.8, w: 3, h: 3,
      fill: { color: C.gold, transparency: 94 },
      line: { color: C.gold, width: 0 },
      rotate: 45,
    });
    slide.addText("千元投入 · 全链路提效 · 每迭代省 6～8 小时", {
      x: 0.8, y: 1.5, w: 8.4, h: 0.45,
      fontSize: 14, fontFace: FONT, color: C.gold, charSpacing: 1, align: "center", margin: 0,
    });
    goldLine(slide, 4.2, 2.05, 1.6);
    slide.addText("AI 不是替代测试\n是把测试从写表格里解放出来\n去做真正有价值的质量设计", {
      x: 0.8, y: 2.3, w: 8.4, h: 1.8,
      fontSize: 26, fontFace: FONT, color: C.white, bold: true, align: "center", margin: 0,
    });
    slide.addText("童美娜  ·  软件部  ·  Q & A", {
      x: 0.8, y: 4.55, w: 8.4, h: 0.4,
      fontSize: 12, fontFace: FONT, color: C.muted, align: "center", margin: 0,
    });
  }

  const outPath = path.join(__dirname, "AI驱动的QA提效助手-先锋赛-v2.pptx");
  return pres.writeFile({ fileName: outPath }).then(() => outPath);
}

build()
  .then((p) => console.log("PPT 已生成:", p))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
