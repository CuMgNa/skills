/**
 * AI 驱动的 QA 提效助手 - AI 应用先锋赛 PPT
 * 科技风格 | 领导汇报版 | 18页
 * 配色：深海蓝 + 青碧绿 + 白色 (Midnight Executive + Teal Trust)
 */
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "童美娜";
pres.title = "AI 驱动的 QA 提效助手";

// ============================================================
// 统一配色 & 字体
// ============================================================
const C = {
  darkBg:   "0A1628",   // 深夜蓝 - 封面/封底背景
  navy:     "0D2045",   // 深蓝 - 内容页背景
  card:     "132954",   // 卡片背景
  cardAlt:  "0D3356",   // 卡片备用色
  teal:     "00B4D8",   // 主强调色 - 青碧
  tealDark: "0096C7",   // 次强调色
  tealDeep: "023E8A",   // 深蓝色块
  white:    "FFFFFF",
  light:    "E0F4FF",   // 浅蓝白 - 正文
  muted:    "8BBCD4",   // 弱化文字
  accent:   "00F5D4",   // 亮绿强调
  warn:     "FFB703",   // 黄色数字
  red:      "EF4444",   // 红色警示
  green:    "22C55E",   // 绿色正向
};

const FONT_TITLE = "Arial Black";
const FONT_BODY  = "Calibri";

// ============================================================
// 工具函数
// ============================================================
function makeShadow() {
  return { type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.25 };
}

/** 深色背景全页 */
function darkBg(slide, color) {
  slide.background = { color: color || C.navy };
}

/** 左侧竖条装饰 */
function leftBar(slide, color, y, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: y !== undefined ? y : 0, w: 0.12, h: h !== undefined ? h : 5.625,
    fill: { color: color || C.teal }, line: { color: color || C.teal }
  });
}

/** 顶部横条 */
function topBar(slide, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: color || C.teal }, line: { color: color || C.teal }
  });
}

/** 底部横条 */
function bottomBar(slide, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.545, w: 10, h: 0.08,
    fill: { color: color || C.teal }, line: { color: color || C.teal }
  });
}

/** 页码 + 页脚标签 */
function footer(slide, page, total, label) {
  slide.addText(`${page} / ${total}`, {
    x: 8.8, y: 5.2, w: 1, h: 0.3,
    fontSize: 9, color: C.muted, fontFace: FONT_BODY, align: "right"
  });
  if (label) {
    slide.addText(label, {
      x: 0.2, y: 5.2, w: 5, h: 0.3,
      fontSize: 9, color: C.muted, fontFace: FONT_BODY
    });
  }
}

/** 分区标题（左侧竖条+标题） */
function sectionTitle(slide, text, y) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.45, y: y, w: 0.06, h: 0.45,
    fill: { color: C.teal }, line: { color: C.teal }
  });
  slide.addText(text, {
    x: 0.58, y: y - 0.02, w: 9, h: 0.5,
    fontSize: 18, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });
}

/** 卡片矩形 */
function card(slide, x, y, w, h, bgColor) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: bgColor || C.card },
    line: { color: C.tealDark, pt: 0.5 },
    shadow: makeShadow()
  });
}

/** 大数字突出显示 */
function bigStat(slide, num, label, x, y, numColor) {
  slide.addText(num, {
    x, y, w: 2.2, h: 0.8,
    fontSize: 44, bold: true, color: numColor || C.warn, fontFace: FONT_TITLE,
    align: "center", margin: 0
  });
  slide.addText(label, {
    x, y: y + 0.72, w: 2.2, h: 0.4,
    fontSize: 11, color: C.light, fontFace: FONT_BODY, align: "center"
  });
}

// ============================================================
// 幻灯片构建
// ============================================================

// ── 封面 (第1页) ────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.darkBg);
  topBar(s, C.teal);
  bottomBar(s, C.teal);
  leftBar(s, C.teal);

  // 装饰：右侧大圆
  s.addShape(pres.shapes.OVAL, {
    x: 6.8, y: -1.5, w: 5.5, h: 5.5,
    fill: { color: C.tealDeep, transparency: 55 },
    line: { color: C.teal, pt: 1 }
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7.5, y: -0.8, w: 3.8, h: 3.8,
    fill: { color: C.teal, transparency: 80 },
    line: { color: C.accent, pt: 0.5 }
  });

  // 标签行
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.0, w: 2.8, h: 0.38,
    fill: { color: C.teal }, line: { color: C.teal }
  });
  s.addText("AI 应用先锋赛案例", {
    x: 0.5, y: 1.0, w: 2.8, h: 0.38,
    fontSize: 11, bold: true, color: C.darkBg, fontFace: FONT_BODY,
    align: "center", valign: "middle", margin: 0
  });

  // 主标题
  s.addText("让 QA 从「填表写报告」", {
    x: 0.5, y: 1.6, w: 9, h: 0.85,
    fontSize: 36, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });
  s.addText("回到「找问题、保质量」", {
    x: 0.5, y: 2.38, w: 9, h: 0.85,
    fontSize: 36, bold: true, color: C.teal, fontFace: FONT_TITLE, margin: 0
  });

  // 副标题
  s.addText("AI 驱动的 QA 提效助手  |  AI 应用先锋赛案例", {
    x: 0.5, y: 3.35, w: 7, h: 0.4,
    fontSize: 15, color: C.light, fontFace: FONT_BODY, margin: 0
  });

  // 落款
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 4.4, w: 3.5, h: 0,
    line: { color: C.muted, pt: 0.5 }
  });
  s.addText("童美娜  ·  软件部  ·  测试工程师  ·  2026/3", {
    x: 0.5, y: 4.5, w: 6, h: 0.35,
    fontSize: 12, color: C.muted, fontFace: FONT_BODY, margin: 0
  });
}

// ── 第2页：痛点 ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("我们在解决什么问题？", {
    x: 0.45, y: 0.2, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 核心金句
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.45, y: 0.9, w: 9.1, h: 0.65,
    fill: { color: C.tealDeep }, line: { color: C.teal, pt: 1 }
  });
  s.addText("每个迭代，QA 大量时间耗在「写用例 + 重复录入 + 手工汇总 + 多端同步」，而不是专注找问题和保质量", {
    x: 0.45, y: 0.9, w: 9.1, h: 0.65,
    fontSize: 13, bold: true, color: C.accent, fontFace: FONT_BODY,
    align: "center", valign: "middle", margin: [0, 8, 0, 8]
  });

  // 5张痛点卡片
  const painPoints = [
    { icon: "📋", title: "测试用例设计", before: "手工逐条写", pain: "覆盖靠经验，边界易漏" },
    { icon: "🐛", title: "缺陷登记",     before: "截图→手工填禅道", pain: "单条 3～5 分钟，一轮数十条" },
    { icon: "📊", title: "测试报告",     before: "禅道逐条复制", pain: "单份 2～3 小时" },
    { icon: "📱", title: "团队同步",     before: "报告写完再摘抄", pain: "多端切换，时效差" },
    { icon: "🔀", title: "信息来源",     before: "截图/聊天/邮件散落", pain: "易漏登、重复登" },
  ];
  const cx = [0.45, 2.35, 4.25, 6.15, 8.05];
  painPoints.forEach((p, i) => {
    card(s, cx[i], 1.7, 1.75, 3.2);
    s.addText(p.icon, {
      x: cx[i], y: 1.75, w: 1.75, h: 0.55,
      fontSize: 22, align: "center", fontFace: FONT_BODY
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx[i] + 0.08, y: 2.35, w: 1.59, h: 0.04,
      fill: { color: C.teal }, line: { color: C.teal }
    });
    s.addText(p.title, {
      x: cx[i], y: 2.42, w: 1.75, h: 0.38,
      fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center"
    });
    s.addText(p.before, {
      x: cx[i], y: 2.82, w: 1.75, h: 0.38,
      fontSize: 10, color: C.muted, fontFace: FONT_BODY, align: "center"
    });
    s.addText(p.pain, {
      x: cx[i], y: 3.2, w: 1.75, h: 0.6,
      fontSize: 10, color: C.warn, fontFace: FONT_BODY, align: "center"
    });
  });

  // 金句
  s.addText("测试员像「文员」多于「质检员」——问题不在会不会测，而在大量低价值文书活挤占了质量分析时间", {
    x: 0.45, y: 5.0, w: 9.1, h: 0.38,
    fontSize: 11, italic: true, color: C.muted, fontFace: FONT_BODY, align: "center"
  });
  footer(s, 2, 18, "第一部分：挑战描述");
}

// ── 第3页：Before 流程图 ─────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("传统做法 — 低效单链路", {
    x: 0.45, y: 0.2, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 流程步骤
  const steps = [
    "📄 读需求\n手工写用例",
    "🧪 执行测试",
    "🐛 发现 Bug",
    "⌨️ 手工填\n禅道表单",
    "📤 逐条导出",
    "📝 手工写报告\n2～3 小时",
    "📱 复制摘要\n发钉钉"
  ];
  const stepW = 1.18;
  const stepGap = 0.1;
  const startX = 0.45;
  const sy = 1.5;

  steps.forEach((txt, i) => {
    const bx = startX + i * (stepW + stepGap);
    card(s, bx, sy, stepW, 1.6, C.card);
    // 编号圆
    s.addShape(pres.shapes.OVAL, {
      x: bx + (stepW - 0.36) / 2, y: sy + 0.08, w: 0.36, h: 0.36,
      fill: { color: C.teal }, line: { color: C.teal }
    });
    s.addText(String(i + 1), {
      x: bx + (stepW - 0.36) / 2, y: sy + 0.08, w: 0.36, h: 0.36,
      fontSize: 11, bold: true, color: C.darkBg, fontFace: FONT_TITLE,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(txt, {
      x: bx + 0.05, y: sy + 0.52, w: stepW - 0.1, h: 0.95,
      fontSize: 9.5, color: C.light, fontFace: FONT_BODY, align: "center", valign: "middle"
    });
    // 箭头
    if (i < steps.length - 1) {
      s.addText("▶", {
        x: bx + stepW, y: sy + 0.55, w: stepGap + 0.05, h: 0.5,
        fontSize: 10, color: C.teal, align: "center", valign: "middle", fontFace: FONT_BODY
      });
    }
  });

  // 4个数字
  const stats = [
    { n: "20+", l: "中等模块\n手工写用例(条)" },
    { n: "3~5", l: "单条缺陷录入\n(分钟)" },
    { n: "2~3", l: "单份测试报告\n(小时)" },
    { n: "每轮", l: "每次迭代\n必重复执行" },
  ];
  const sx2 = [0.65, 3.0, 5.4, 7.7];
  stats.forEach((st, i) => {
    card(s, sx2[i], 3.4, 2.0, 1.6, C.tealDeep);
    s.addText(st.n, {
      x: sx2[i], y: 3.48, w: 2.0, h: 0.72,
      fontSize: 38, bold: true, color: C.warn, fontFace: FONT_TITLE,
      align: "center", margin: 0
    });
    s.addText(st.l, {
      x: sx2[i], y: 4.2, w: 2.0, h: 0.65,
      fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center"
    });
  });

  footer(s, 3, 18, "第一部分：挑战描述");
}

// ── 第4页：ROI 价值 ──────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("投入与回报 — 千元级工具，百小时级价值", {
    x: 0.45, y: 0.2, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 左侧 ROI 卡
  card(s, 0.45, 0.9, 4.3, 4.2, C.tealDeep);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 0.9, w: 4.3, h: 0.42, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("年度投入", { x: 0.45, y: 0.9, w: 4.3, h: 0.42, fontSize: 14, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  s.addText("¥1,380", { x: 0.45, y: 1.42, w: 4.3, h: 0.85, fontSize: 52, bold: true, color: C.warn, fontFace: FONT_TITLE, align: "center", margin: 0 });
  s.addText("/年", { x: 0.45, y: 2.2, w: 4.3, h: 0.35, fontSize: 14, color: C.light, fontFace: FONT_BODY, align: "center" });
  s.addText([
    { text: "Cursor 教育版  ¥400/年", options: { breakLine: true } },
    { text: "Coding Plan  ¥980/年", options: { breakLine: true } },
  ], { x: 0.65, y: 2.65, w: 3.9, h: 0.7, fontSize: 12, color: C.muted, fontFace: FONT_BODY, align: "left" });
  // 隐性收益
  s.addText("隐性收益", { x: 0.65, y: 3.45, w: 3.9, h: 0.32, fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY });
  s.addText([
    { text: "• QA 时间转向测试设计与风险分析", options: { breakLine: true } },
    { text: "• 缺陷信息结构化可复用为回归依据", options: { breakLine: true } },
    { text: "• Skills 经验沉淀，换项目即复用", options: {} },
  ], { x: 0.65, y: 3.78, w: 3.9, h: 0.9, fontSize: 10, color: C.light, fontFace: FONT_BODY });

  // 右侧产出
  card(s, 5.2, 0.9, 4.35, 4.2, C.card);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 0.9, w: 4.35, h: 0.42, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText("年度产出", { x: 5.2, y: 0.9, w: 4.35, h: 0.42, fontSize: 14, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });

  const benefits = [
    { n: "144~192", u: "小时/年", l: "1人节省工时（24迭代×6~8h）" },
    { n: "80%↑", u: "", l: "报告产出效率提升" },
    { n: "90%↓", u: "", l: "单条缺陷录入时间" },
    { n: "≥95%", u: "", l: "缺陷登记完整率" },
  ];
  benefits.forEach((b, i) => {
    const by = 1.42 + i * 0.9;
    s.addText(b.n, { x: 5.2, y: by, w: 2.0, h: 0.62, fontSize: 28, bold: true, color: C.accent, fontFace: FONT_TITLE, align: "center", margin: 0 });
    s.addText(b.u + "\n" + b.l, { x: 7.2, y: by + 0.05, w: 2.2, h: 0.6, fontSize: 10, color: C.light, fontFace: FONT_BODY, valign: "middle" });
    if (i < benefits.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 5.3, y: by + 0.72, w: 4.1, h: 0, line: { color: C.tealDark, pt: 0.3 } });
    }
  });

  // 底部结论
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 5.1, w: 9.1, h: 0.38, fill: { color: C.teal, transparency: 20 }, line: { color: C.teal } });
  s.addText("千元级工具投入，换每人每年百余小时高价值工作时间", {
    x: 0.45, y: 5.1, w: 9.1, h: 0.38,
    fontSize: 13, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0
  });

  footer(s, 4, 18, "第一部分：挑战描述");
}

// ── 第5页：方案总览 ──────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("方案总览 — 需求进，报告出", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });
  s.addText("AI 覆盖 QA 全生命周期：写用例 → 执行测试 → 登记缺陷 → 汇总报告 → 团队同步", {
    x: 0.45, y: 0.72, w: 9.1, h: 0.35,
    fontSize: 12, color: C.light, fontFace: FONT_BODY
  });

  // 流水线节点
  const nodes = [
    { t: "需求与\n测试计划", ic: "📄", c: C.card },
    { t: "AI生成\n测试用例", ic: "🤖", c: C.tealDeep },
    { t: "人工\n执行测试", ic: "🧪", c: C.card },
    { t: "截图/\n文字输入", ic: "📸", c: C.card },
    { t: "Agent1\n缺陷录入", ic: "🐛", c: C.tealDeep },
    { t: "禅道\n缺陷库", ic: "📁", c: C.card },
    { t: "Agent2\n报告发布", ic: "📊", c: C.tealDeep },
  ];
  const nx = [0.18, 1.52, 2.86, 4.2, 5.54, 6.88, 8.22];
  const ny = 1.2;
  const nw = 1.2;
  const nh = 1.55;
  nodes.forEach((n, i) => {
    card(s, nx[i], ny, nw, nh, n.c);
    if (n.c === C.tealDeep) {
      s.addShape(pres.shapes.RECTANGLE, { x: nx[i], y: ny, w: nw, h: 0.06, fill: { color: C.teal }, line: { color: C.teal } });
    }
    s.addText(n.ic, { x: nx[i], y: ny + 0.1, w: nw, h: 0.5, fontSize: 20, align: "center", fontFace: FONT_BODY });
    s.addText(n.t, { x: nx[i], y: ny + 0.62, w: nw, h: 0.8, fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center", valign: "middle" });
    if (i < nodes.length - 1) {
      s.addText("▶", { x: nx[i] + nw, y: ny + 0.5, w: 0.14, h: 0.55, fontSize: 11, color: C.teal, align: "center", valign: "middle", fontFace: FONT_BODY });
    }
  });

  // 下方分叉：报告 → 钉钉/Notion
  s.addText("▼", { x: 8.82, y: 2.8, w: 0.3, h: 0.3, fontSize: 12, color: C.teal, align: "center", fontFace: FONT_BODY });
  card(s, 7.5, 3.15, 1.9, 0.7, C.card);
  s.addText("📱 钉钉文档 + 群推送", { x: 7.5, y: 3.15, w: 1.9, h: 0.7, fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center", valign: "middle" });
  s.addText("↘ 可选", { x: 7.7, y: 3.88, w: 1.2, h: 0.25, fontSize: 9, color: C.muted, fontFace: FONT_BODY });
  card(s, 7.5, 4.15, 1.9, 0.6, C.card);
  s.addText("📚 Notion 归档", { x: 7.5, y: 4.15, w: 1.9, h: 0.6, fontSize: 10, color: C.muted, fontFace: FONT_BODY, align: "center", valign: "middle" });

  // 定时触发标注
  s.addShape(pres.shapes.RECTANGLE, { x: 0.18, y: 3.15, w: 2.5, h: 0.62, fill: { color: C.card }, line: { color: C.accent, pt: 0.8 } });
  s.addText("⏰ WorkBuddy 定时触发\n自动拉取缺陷 · 定时出报告", { x: 0.18, y: 3.15, w: 2.5, h: 0.62, fontSize: 9, color: C.accent, fontFace: FONT_BODY, align: "center", valign: "middle" });
  // 虚线箭头
  s.addShape(pres.shapes.LINE, { x: 1.43, y: 3.47, w: 6.9, h: 0, line: { color: C.accent, pt: 0.8, dashType: "dash" } });

  // 4技术支柱
  const techs = [
    { t: "Cursor", d: "AI 编程与对话环境" },
    { t: "Skills", d: "固化 SOP 可重复执行" },
    { t: "MCP 连接器", d: "对接禅道/钉钉/Notion" },
    { t: "WorkBuddy", d: "定时触发 · 双模式" },
  ];
  techs.forEach((tc, i) => {
    const tx = 0.45 + i * 2.3;
    s.addShape(pres.shapes.RECTANGLE, { x: tx, y: 4.0, w: 2.1, h: 0.08, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(tc.t, { x: tx, y: 4.1, w: 2.1, h: 0.3, fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center" });
    s.addText(tc.d, { x: tx, y: 4.4, w: 2.1, h: 0.3, fontSize: 9, color: C.muted, fontFace: FONT_BODY, align: "center" });
  });

  footer(s, 5, 18, "第二部分：解决方案");
}

// ── 第6页：写用例提效 ──────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("写用例提效 — 测试方法论内置，AI 批量生成", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 4步流程
  const steps4 = [
    { n: "01", t: "输入",     d: "测试计划 plan.md\n+ 澄清后需求 index.md" },
    { n: "02", t: "触发生成", d: "执行 /testcase-gen\nAI 按测试点分批生成" },
    { n: "03", t: "方法论内置", d: "等价类+边界值\n正向/反向/边界自动覆盖" },
    { n: "04", t: "质量闸门", d: "validate.py 校验格式重复\n→ all_cases.md 合并" },
  ];
  steps4.forEach((st, i) => {
    const bx = 0.45 + i * 2.4;
    card(s, bx, 0.9, 2.2, 2.0, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: 0.9, w: 2.2, h: 0.42, fill: { color: i === 2 ? C.accent : C.teal }, line: { color: C.teal } });
    s.addText(st.n, { x: bx, y: 0.9, w: 2.2, h: 0.42, fontSize: 18, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: bx, y: 1.38, w: 2.2, h: 0.38, fontSize: 12, bold: true, color: C.white, fontFace: FONT_BODY, align: "center" });
    s.addText(st.d, { x: bx + 0.1, y: 1.78, w: 2.0, h: 0.95, fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center", valign: "middle" });
    if (i < 3) {
      s.addText("▶", { x: bx + 2.2, y: 1.5, w: 0.2, h: 0.4, fontSize: 12, color: C.teal, align: "center", fontFace: FONT_BODY });
    }
  });

  // 中间统计数据
  s.addText("参考产出规模（技能文档示例）", { x: 0.45, y: 3.1, w: 9, h: 0.35, fontSize: 13, bold: true, color: C.teal, fontFace: FONT_BODY });
  const scards = [
    { n: "8", l: "测试项" },
    { n: "20", l: "测试点" },
    { n: "75", l: "生成用例数" },
    { n: "100%", l: "有效等价类覆盖" },
    { n: "90%", l: "边界值覆盖" },
  ];
  scards.forEach((sc, i) => {
    const sx = 0.45 + i * 1.9;
    card(s, sx, 3.5, 1.7, 1.6, C.tealDeep);
    s.addText(sc.n, { x: sx, y: 3.58, w: 1.7, h: 0.72, fontSize: 32, bold: true, color: C.warn, fontFace: FONT_TITLE, align: "center", margin: 0 });
    s.addText(sc.l, { x: sx, y: 4.3, w: 1.7, h: 0.4, fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center" });
  });

  s.addText("不是让 AI 随便编用例，而是把「等价类 + 边界值」测试基本功自动化，人只做审核", {
    x: 0.45, y: 5.05, w: 9.1, h: 0.35,
    fontSize: 11, italic: true, color: C.muted, fontFace: FONT_BODY, align: "center"
  });
  footer(s, 6, 18, "第二部分：解决方案");
}

// ── 第7页：Agent1 截图→禅道 ──────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("Agent1 — 截图 → 结构化 Bug → 自动写禅道", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 左侧3步
  const steps3 = [
    { n: "1", t: "上传截图", d: "支持红框/箭头标注优先识别\n「红框 > 红箭头 > 红字」规则" },
    { n: "2", t: "AI 结构化输出", d: "标准 8 块字段：标题 / 步骤 / 预期\n实际结果 / 严重程度 / 环境 …\n▸ 人工确认 ◂" },
    { n: "3", t: "一键写入禅道", d: "脚本创建缺陷，返回 Bug ID\n支持幂等检查，避免重复创建" },
  ];
  steps3.forEach((st, i) => {
    const sy = 1.0 + i * 1.45;
    card(s, 0.45, sy, 4.5, 1.3);
    s.addShape(pres.shapes.OVAL, { x: 0.55, y: sy + 0.3, w: 0.52, h: 0.52, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(st.n, { x: 0.55, y: sy + 0.3, w: 0.52, h: 0.52, fontSize: 16, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: 1.15, y: sy + 0.12, w: 3.7, h: 0.36, fontSize: 13, bold: true, color: C.teal, fontFace: FONT_BODY });
    s.addText(st.d, { x: 1.15, y: sy + 0.48, w: 3.65, h: 0.72, fontSize: 10, color: C.light, fontFace: FONT_BODY });
  });

  // 右侧效果展示
  card(s, 5.3, 1.0, 4.3, 4.0, C.tealDeep);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.0, w: 4.3, h: 0.42, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("缺陷单示例（AI 生成）", { x: 5.3, y: 1.0, w: 4.3, h: 0.42, fontSize: 12, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  const bugFields = [
    ["标题", "【登录页】输入错误密码后错误提示未显示"],
    ["严重程度", "高 (High)"],
    ["前置条件", "用户已注册，密码正确为 Test1234"],
    ["测试步骤", "1. 打开登录页  2. 输入正确用户名  3. 输入错误密码  4. 点击登录"],
    ["预期结果", "显示「密码错误」红色提示文字"],
    ["实际结果", "页面无任何提示，仅清空密码框"],
    ["优先级", "P1"],
    ["环境", "Android 14 / App v2.1.3"],
  ];
  bugFields.forEach((row, i) => {
    const fy = 1.5 + i * 0.36;
    s.addText(row[0], { x: 5.38, y: fy, w: 1.1, h: 0.32, fontSize: 9, bold: true, color: C.teal, fontFace: FONT_BODY });
    s.addText(row[1], { x: 6.5, y: fy, w: 2.95, h: 0.32, fontSize: 9, color: C.light, fontFace: FONT_BODY });
    s.addShape(pres.shapes.LINE, { x: 5.38, y: fy + 0.33, w: 4.1, h: 0, line: { color: C.tealDark, pt: 0.3 } });
  });

  // 数字对比
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.55, w: 4.5, h: 0.7, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText([
    { text: "3~5 分钟 → ≤30 秒", options: { bold: true, color: C.warn } },
    { text: "  |  单条录入耗时节省约 90%", options: { color: C.light } }
  ], { x: 0.45, y: 4.55, w: 4.5, h: 0.7, fontSize: 12, fontFace: FONT_BODY, align: "center", valign: "middle" });

  footer(s, 7, 18, "第二部分：解决方案");
}

// ── 第8页：Agent2 拉缺陷→报告→钉钉 ───────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("Agent2 — 拉缺陷 → 写报告 → 推钉钉", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 4步闭环（横排卡片）
  const steps4b = [
    { n: "1", t: "拉取缺陷", d: "脚本从禅道获取\n支持「仅未关闭」筛选" },
    { n: "2", t: "AI 生成报告", d: "按模板三节结构\n测试结果/未解决/附件" },
    { n: "3", t: "写入钉钉文档", d: "分块 append 写入\n「测试报告」文件夹" },
    { n: "4", t: "群推送摘要", d: "机器人推送测试结论\n@相关负责人" },
  ];
  steps4b.forEach((st, i) => {
    const bx = 0.45 + i * 2.4;
    card(s, bx, 0.9, 2.2, 1.7, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: 0.9, w: 2.2, h: 0.4, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(`步骤 ${st.n}`, { x: bx, y: 0.9, w: 2.2, h: 0.4, fontSize: 12, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: bx, y: 1.35, w: 2.2, h: 0.38, fontSize: 12, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center" });
    s.addText(st.d, { x: bx + 0.1, y: 1.72, w: 2.0, h: 0.75, fontSize: 10, color: C.light, fontFace: FONT_BODY, align: "center" });
    if (i < 3) {
      s.addText("→", { x: bx + 2.2, y: 1.45, w: 0.2, h: 0.35, fontSize: 14, bold: true, color: C.teal, align: "center", fontFace: FONT_BODY });
    }
  });

  // 实测案例
  card(s, 0.45, 2.85, 9.1, 1.6, C.tealDeep);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 2.85, w: 9.1, h: 0.4, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText("实测案例 — 【磐钴】位置监控平台-国际化  ·  2026-06-11", { x: 0.45, y: 2.85, w: 9.1, h: 0.4, fontSize: 12, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  const realStats = [
    { n: "19", l: "自动汇总\n缺陷条数" },
    { n: "5",  l: "未解决\n缺陷" },
    { n: "14", l: "待回归\n缺陷" },
    { n: "3节", l: "报告结构\n一次生成" },
    { n: "≤20", l: "分钟完成\n（原2~3小时）" },
  ];
  realStats.forEach((rs, i) => {
    const rx = 0.9 + i * 1.75;
    s.addText(rs.n, { x: rx, y: 3.32, w: 1.4, h: 0.6, fontSize: 30, bold: true, color: C.warn, fontFace: FONT_TITLE, align: "center", margin: 0 });
    s.addText(rs.l, { x: rx, y: 3.92, w: 1.4, h: 0.42, fontSize: 9, color: C.light, fontFace: FONT_BODY, align: "center" });
  });

  // 数字结论
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.65, w: 9.1, h: 0.6, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("测试报告 2～3 小时  →  ≤20 分钟  |  效率提升约 80%+  |  钉钉群实时触达", {
    x: 0.45, y: 4.65, w: 9.1, h: 0.6,
    fontSize: 13, bold: true, color: C.warn, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0
  });

  footer(s, 8, 18, "第二部分：解决方案");
}

// ── 第9页：双Agent分工 ───────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("双 Agent 分工 — 职责清晰 · 可单独使用 · 可串行全流程", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 20, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 三列卡片
  const agents = [
    {
      title: "Agent1\n缺陷录入",
      color: C.teal,
      does: ["截图识别", "AI 生成 8 块 Bug 单", "用户确认后写入禅道", "返回 Bug ID + 链接"],
      not:  ["不写报告", "不推钉钉"]
    },
    {
      title: "Agent2\n报告发布",
      color: C.accent,
      does: ["从禅道拉取缺陷", "AI 生成三节报告", "分块写入钉钉文档", "机器人推送群摘要"],
      not:  ["不新建 Bug", "不截图识别"]
    },
    {
      title: "编排层\nOrchestrator",
      color: C.warn,
      does: ["串行调度双 Agent", "handoff 契约交接", "分级失败策略", "「全流程」一句话触发"],
      not:  ["用户说「只提 Bug」", "用户说「只出报告」"]
    },
  ];
  agents.forEach((ag, i) => {
    const ax = 0.45 + i * 3.2;
    card(s, ax, 0.9, 2.95, 4.0, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: ax, y: 0.9, w: 2.95, h: 0.5, fill: { color: ag.color }, line: { color: ag.color } });
    s.addText(ag.title, { x: ax, y: 0.9, w: 2.95, h: 0.5, fontSize: 13, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText("✅ 做什么", { x: ax + 0.1, y: 1.48, w: 2.75, h: 0.32, fontSize: 11, bold: true, color: ag.color, fontFace: FONT_BODY });
    ag.does.forEach((d, j) => {
      s.addText(`• ${d}`, { x: ax + 0.15, y: 1.82 + j * 0.32, w: 2.65, h: 0.3, fontSize: 10, color: C.light, fontFace: FONT_BODY });
    });
    s.addShape(pres.shapes.LINE, { x: ax + 0.1, y: 3.15, w: 2.75, h: 0, line: { color: C.muted, pt: 0.3 } });
    s.addText("❌ 不做什么", { x: ax + 0.1, y: 3.22, w: 2.75, h: 0.3, fontSize: 11, bold: true, color: C.muted, fontFace: FONT_BODY });
    ag.not.forEach((d, j) => {
      s.addText(`• ${d}`, { x: ax + 0.15, y: 3.54 + j * 0.28, w: 2.65, h: 0.26, fontSize: 10, color: C.muted, fontFace: FONT_BODY });
    });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 5.1, w: 9.1, h: 0.38, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("可以「只提缺陷」或「只出报告」，也可以「截图到报告一条龙」", {
    x: 0.45, y: 5.1, w: 9.1, h: 0.38,
    fontSize: 12, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center", valign: "middle"
  });

  footer(s, 9, 18, "第二部分：解决方案");
}

// ── 第10页：Skills 技能地图 ──────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("Skills 技能地图 — 经验固化，换项目即复用", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  const layers = [
    { layer: "测试设计", color: C.accent,   skills: [{ n: "testcase-generator", d: "需求→批量用例→校验合并" }] },
    { layer: "编排",     color: C.teal,     skills: [{ n: "qa-orchestrator", d: "缺陷+报告全流程路由" }] },
    { layer: "Agent",   color: C.tealDark,  skills: [{ n: "qa-agent-defect-intake", d: "截图→禅道" }, { n: "qa-agent-report-publish", d: "报告→钉钉" }] },
    { layer: "底层",    color: C.warn,      skills: [{ n: "defect-screenshot-bug-ticket", d: "截图解析规范" }, { n: "zentao-bug-summary", d: "禅道数据提取" }, { n: "dingtalk-test-report", d: "钉钉发布" }, { n: "test-report", d: "报告模板" }] },
    { layer: "脚本",    color: C.muted,     skills: [{ n: "validate.py", d: "用例校验" }, { n: "to_excel.py", d: "导出Excel" }, { n: "zentao-bug-create.mjs", d: "禅道写入" }, { n: "qa-pipeline.mjs", d: "全链路" }] },
  ];

  layers.forEach((ly, i) => {
    const ly_y = 0.85 + i * 0.89;
    // 层级标签
    s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: ly_y, w: 1.2, h: 0.7, fill: { color: ly.color, transparency: ly.color === C.muted ? 60 : 0 }, line: { color: ly.color } });
    s.addText(ly.layer, { x: 0.45, y: ly_y, w: 1.2, h: 0.7, fontSize: 11, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });

    // 技能卡片
    ly.skills.forEach((sk, j) => {
      const sx = 1.8 + j * 2.05;
      s.addShape(pres.shapes.RECTANGLE, {
        x: sx, y: ly_y + 0.04, w: 1.92, h: 0.62,
        fill: { color: C.card }, line: { color: ly.color, pt: 0.8 }
      });
      s.addText(sk.n, { x: sx + 0.07, y: ly_y + 0.06, w: 1.78, h: 0.3, fontSize: 9.5, bold: true, color: ly.color, fontFace: FONT_BODY });
      s.addText(sk.d, { x: sx + 0.07, y: ly_y + 0.35, w: 1.78, h: 0.28, fontSize: 8.5, color: C.muted, fontFace: FONT_BODY });
    });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 5.12, w: 9.1, h: 0.38, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("经验写成 Skills，换项目改配置即可复用，而非每次从零 prompt", {
    x: 0.45, y: 5.12, w: 9.1, h: 0.38,
    fontSize: 12, bold: true, color: C.accent, fontFace: FONT_BODY, align: "center", valign: "middle"
  });

  footer(s, 10, 18, "第二部分：解决方案");
}

// ── 第11页：实施路径 ─────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("实施路径 — 四阶段从 0 到 1", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  const phases = [
    { n: "阶段 0", t: "测试设计", c: C.accent,
      did: "等价类/边界值方法论内置\n分批生成 + 校验脚本",
      out: "testcase-generator\nvalidate.py / to_excel.py" },
    { n: "阶段 1", t: "单点突破", c: C.teal,
      did: "截图提 Bug\n禅道写入脚本",
      out: "defect-screenshot-bug-ticket\nzentao-bug-create.mjs" },
    { n: "阶段 2", t: "报告自动化", c: C.tealDark,
      did: "禅道拉取 + 报告模板\n钉钉推送",
      out: "test-report\ndingtalk-test-report" },
    { n: "阶段 3", t: "编排闭环", c: C.warn,
      did: "双 Agent + handoff\n一键 pipeline + 定时触发",
      out: "qa-orchestrator\nqa-pipeline.mjs" },
  ];

  phases.forEach((ph, i) => {
    const px = 0.45 + i * 2.4;
    // 顶部色块标签
    card(s, px, 0.9, 2.2, 3.8, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: px, y: 0.9, w: 2.2, h: 0.52, fill: { color: ph.c }, line: { color: ph.c } });
    s.addText(ph.n, { x: px, y: 0.9, w: 2.2, h: 0.28, fontSize: 11, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "top", margin: [4, 0, 0, 0] });
    s.addText(ph.t, { x: px, y: 1.12, w: 2.2, h: 0.28, fontSize: 12, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", margin: 0 });
    // 竖线连接
    if (i < 3) {
      s.addText("▶", { x: px + 2.2, y: 2.35, w: 0.2, h: 0.3, fontSize: 12, color: ph.c, align: "center", fontFace: FONT_BODY });
    }
    s.addText("做了什么", { x: px + 0.1, y: 1.5, w: 2.0, h: 0.28, fontSize: 9.5, bold: true, color: C.teal, fontFace: FONT_BODY });
    s.addText(ph.did, { x: px + 0.1, y: 1.78, w: 2.0, h: 0.7, fontSize: 9.5, color: C.light, fontFace: FONT_BODY });
    s.addShape(pres.shapes.LINE, { x: px + 0.1, y: 2.52, w: 2.0, h: 0, line: { color: C.tealDark, pt: 0.3 } });
    s.addText("产出", { x: px + 0.1, y: 2.6, w: 2.0, h: 0.28, fontSize: 9.5, bold: true, color: C.accent, fontFace: FONT_BODY });
    s.addText(ph.out, { x: px + 0.1, y: 2.88, w: 2.0, h: 0.6, fontSize: 9, color: C.muted, fontFace: FONT_BODY });
  });

  // 工具说明
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.88, w: 9.1, h: 0.55, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText([
    { text: "工具：", options: { bold: true, color: C.teal } },
    { text: "Cursor（技能开发与调试）", options: { color: C.light } },
    { text: "  +  ", options: { color: C.muted } },
    { text: "MiniMax Coding Plan（辅助编码）", options: { color: C.light } },
    { text: "  +  ", options: { color: C.muted } },
    { text: "WorkBuddy（定时自动化）", options: { color: C.accent } },
  ], { x: 0.65, y: 4.88, w: 8.7, h: 0.55, fontSize: 12, fontFace: FONT_BODY, valign: "middle" });

  footer(s, 11, 18, "第三部分：实施与调整");
}

// ── 第12页：踩坑与迭代 ──────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("实践中遇到的问题与解决 — 技能迭代固化经验", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 20, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  const cases = [
    { n: "#1", prob: "AI生成用例数据模糊（{username}）\n预期不可验证", sol: "固化「数据必须具体+预期可验证」规范\n配合 validate.py 自动拦截" },
    { n: "#2", prob: "用例一次生成过多/覆盖冗余", sol: "按 POINT 分批生成+等价类合并判断\n--check-duplicates 去重" },
    { n: "#3", prob: "截图有红框时AI跑偏描述无关区域", sol: "固化「红框>红箭头>红字」优先级规则" },
    { n: "#4", prob: "禅道步骤写入格式乱（序号/换行）", sol: "统一 1.2.3. 序号 + --steps 真实换行规范" },
    { n: "#5", prob: "报告太长钉钉文档创建失败", sol: "分块 append 追加，推送与正文分离" },
    { n: "#6", prob: "全流程中途失败难恢复", sol: "定义 handoff 契约 + 分级失败策略\n部分失败仍继续出报告" },
  ];

  cases.forEach((c, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const cx = 0.45 + col * 3.2;
    const cy = 0.92 + row * 1.9;
    card(s, cx, cy, 3.0, 1.72, C.card);
    s.addShape(pres.shapes.OVAL, { x: cx + 0.1, y: cy + 0.12, w: 0.46, h: 0.46, fill: { color: C.red }, line: { color: C.red } });
    s.addText(c.n, { x: cx + 0.1, y: cy + 0.12, w: 0.46, h: 0.46, fontSize: 10, bold: true, color: C.white, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText("问题：" + c.prob, { x: cx + 0.62, y: cy + 0.1, w: 2.28, h: 0.7, fontSize: 9, color: C.warn, fontFace: FONT_BODY });
    s.addShape(pres.shapes.LINE, { x: cx + 0.12, y: cy + 0.9, w: 2.76, h: 0, line: { color: C.tealDark, pt: 0.3 } });
    s.addShape(pres.shapes.OVAL, { x: cx + 0.1, y: cy + 0.98, w: 0.46, h: 0.46, fill: { color: C.green }, line: { color: C.green } });
    s.addText("✓", { x: cx + 0.1, y: cy + 0.98, w: 0.46, h: 0.46, fontSize: 14, bold: true, color: C.white, fontFace: FONT_BODY, align: "center", valign: "middle", margin: 0 });
    s.addText("解决：" + c.sol, { x: cx + 0.62, y: cy + 0.98, w: 2.28, h: 0.62, fontSize: 9, color: C.green, fontFace: FONT_BODY });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.88, w: 9.1, h: 0.42, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("不是一次做对，而是通过「技能迭代」把踩坑经验固化下来", {
    x: 0.45, y: 4.88, w: 9.1, h: 0.42,
    fontSize: 13, bold: true, italic: true, color: C.accent, fontFace: FONT_BODY, align: "center", valign: "middle"
  });

  footer(s, 12, 18, "第三部分：实施与调整");
}

// ── 第13页：人机协作边界 ─────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("人机协作边界 — AI 干重复活，人把关关键决策", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 20, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 左侧：AI做什么
  card(s, 0.45, 0.9, 4.3, 3.6, C.tealDeep);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 0.9, w: 4.3, h: 0.45, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("🤖  AI 负责", { x: 0.45, y: 0.9, w: 4.3, h: 0.45, fontSize: 14, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  const aiDoes = [
    "按测试方法论批量生成用例",
    "截图解析与缺陷结构化",
    "从禅道拉取缺陷数据",
    "生成三节测试报告正文",
    "分块写入钉钉文档",
    "机器人推送摘要通知",
    "定时任务自动触发",
  ];
  aiDoes.forEach((d, i) => {
    s.addText(`✅  ${d}`, { x: 0.6, y: 1.45 + i * 0.38, w: 4.0, h: 0.35, fontSize: 11, color: C.light, fontFace: FONT_BODY });
  });

  // 右侧：人做什么
  card(s, 5.2, 0.9, 4.35, 3.6, C.card);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 0.9, w: 4.35, h: 0.45, fill: { color: C.warn }, line: { color: C.warn } });
  s.addText("👤  人工负责", { x: 5.2, y: 0.9, w: 4.35, h: 0.45, fontSize: 14, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  const humanDoes = [
    "审核 AI 生成的测试用例",
    "确认 8 块缺陷字段后再写禅道",
    "判断测试是否通过",
    "把控报告结论准确性",
    "决定何时触发全流程",
    "识别新场景补充测试点",
  ];
  humanDoes.forEach((d, i) => {
    s.addText(`🔑  ${d}`, { x: 5.35, y: 1.45 + i * 0.38, w: 4.05, h: 0.35, fontSize: 11, color: C.light, fontFace: FONT_BODY });
  });

  // 安全设计
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.65, w: 9.1, h: 0.62, fill: { color: C.tealDeep }, line: { color: C.accent } });
  s.addText([
    { text: "安全设计：", options: { bold: true, color: C.accent } },
    { text: "用例生成→人工审核  |  Bug写禅道→用户确认  |  报告基于真实数据  |  幂等检查防重复", options: { color: C.light } }
  ], { x: 0.65, y: 4.65, w: 8.7, h: 0.62, fontSize: 11, fontFace: FONT_BODY, valign: "middle" });

  footer(s, 13, 18, "第三部分：实施与调整");
}

// ── 第14页：数据量化对比 ─────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("数据量化 — 优化前后对比", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  const rows = [
    ["维度", "优化前", "优化后", "提升"],
    ["测试用例编写", "手工 1～2 天/模块", "AI 批量生成，半天内", "约 50~70% ↓"],
    ["用例质量", "格式不一，边界易漏", "等价类+边界值100%覆盖", "有效等价类 100%"],
    ["单条缺陷录入", "3～5 分钟", "≤30 秒", "约 90% ↓"],
    ["单份测试报告", "2～3 小时", "≤20 分钟", "约 80%+ ↑"],
    ["缺陷登记完整率", "人工靠记忆", "≥95%", "结构化提取"],
    ["团队同步", "手工摘抄，时效差", "一键推送，实时一致", "实时触达"],
    ["单迭代 QA 工时", "基准", "节省 6～8 小时+", "可量化"],
  ];

  const colW = [2.15, 2.1, 2.3, 1.85];
  const headerH = 0.42;
  const rowH = 0.48;
  const tx = 0.45;
  const headerColors = [C.tealDeep, C.tealDeep, C.tealDeep, C.tealDeep];
  const headerTextColors = [C.teal, C.muted, C.light, C.accent];

  // Header
  rows[0].forEach((h, ci) => {
    const hx = tx + colW.slice(0, ci).reduce((a, b) => a + b, 0);
    s.addShape(pres.shapes.RECTANGLE, { x: hx, y: 0.88, w: colW[ci], h: headerH, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(h, { x: hx, y: 0.88, w: colW[ci], h: headerH, fontSize: 12, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  });

  // Data rows
  rows.slice(1).forEach((row, ri) => {
    const ry = 0.88 + headerH + ri * rowH;
    const bg = ri % 2 === 0 ? C.card : C.tealDeep;
    row.forEach((cell, ci) => {
      const cx = tx + colW.slice(0, ci).reduce((a, b) => a + b, 0);
      s.addShape(pres.shapes.RECTANGLE, { x: cx, y: ry, w: colW[ci], h: rowH, fill: { color: bg }, line: { color: C.tealDark, pt: 0.3 } });
      const textColor = ci === 3 ? C.accent : (ci === 1 ? C.muted : C.light);
      s.addText(cell, { x: cx + 0.06, y: ry + 0.04, w: colW[ci] - 0.1, h: rowH - 0.06, fontSize: 10, color: textColor, fontFace: FONT_BODY, valign: "middle" });
    });
  });

  // 底部辅证
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 4.98, w: 9.1, h: 0.42, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("实测：【磐钴】位置监控平台-国际化  ·  75条用例(8测试项·20测试点)  ·  19条缺陷自动汇总  ·  2026-06-11", {
    x: 0.45, y: 4.98, w: 9.1, h: 0.42,
    fontSize: 10, color: C.muted, fontFace: FONT_BODY, align: "center", valign: "middle"
  });

  footer(s, 14, 18, "第四部分：最终效果");
}

// ── 第15页：效果展示 ─────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("效果展示 — 完整 QA 链路一览", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 2×3 占位卡
  const items = [
    { t: "测试用例\nall_cases.md", ic: "📋", sub: "75条 · P1～P5优先级 · 边界/反向全覆盖" },
    { t: "禅道缺陷列表", ic: "📁", sub: "缺陷数据源头 · 19条自动汇总" },
    { t: "AI生成测试报告\n(节选)", ic: "📊", sub: "测试结果/未解决/缺陷附件 三节结构" },
    { t: "钉钉文档\n完整报告", ic: "📄", sub: "分块写入 · 「测试报告」文件夹" },
    { t: "钉钉群推送", ic: "📱", sub: "@相关人 · 测试结论摘要" },
    { t: "Cursor\n用例生成过程", ic: "🤖", sub: "/testcase-gen · 含反向/边界用例" },
  ];

  const cols = 3;
  const cardW = 2.9;
  const cardH = 1.9;
  const gapX = 0.2;
  const gapY = 0.25;
  const startX = 0.5;
  const startY = 0.9;

  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ix = startX + col * (cardW + gapX);
    const iy = startY + row * (cardH + gapY);

    card(s, ix, iy, cardW, cardH, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: ix, y: iy, w: cardW, h: 0.06, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(it.ic, { x: ix, y: iy + 0.1, w: cardW, h: 0.55, fontSize: 28, align: "center", fontFace: FONT_BODY });
    s.addText(it.t, { x: ix + 0.1, y: iy + 0.68, w: cardW - 0.2, h: 0.5, fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center" });
    s.addText(it.sub, { x: ix + 0.1, y: iy + 1.2, w: cardW - 0.2, h: 0.55, fontSize: 9, color: C.muted, fontFace: FONT_BODY, align: "center" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 5.08, w: 9.1, h: 0.38, fill: { color: C.tealDeep }, line: { color: C.teal } });
  s.addText("从写用例到群通知，AI 覆盖测试前中后；缺陷+报告链路 原来半天 → 现在约 20 分钟", {
    x: 0.45, y: 5.08, w: 9.1, h: 0.38,
    fontSize: 11, italic: true, color: C.accent, fontFace: FONT_BODY, align: "center", valign: "middle"
  });

  footer(s, 15, 18, "第四部分：最终效果");
}

// ── 第16页：推广建议 ─────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("如何在团队 / 其他项目复制？", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 22, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  const actions = [
    { ic: "🔄", t: "技能复用",    d: "换 projectName / 更新 test-case/plan.md\n即可适配新项目", cost: "低" },
    { ic: "📶", t: "分阶段接入", d: "① 写用例 → ② 截图提 Bug → ③ 自动出报告\n三步可独立上线", cost: "低" },
    { ic: "🎓", t: "培训 30 分钟", d: "/testcase-gen → 上传截图 → 确认 → 说「出报告」\n简单演示即可上手", cost: "1次" },
    { ic: "🔧", t: "接入标准",    d: "测试计划模板 + 禅道规范 + 钉钉 webhook\nCursor 账号（已有基础设施）", cost: "已有" },
  ];

  actions.forEach((a, i) => {
    const ax = 0.45 + i * 2.4;
    card(s, ax, 0.88, 2.2, 2.65, C.card);
    s.addShape(pres.shapes.RECTANGLE, { x: ax, y: 0.88, w: 2.2, h: 0.45, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(`成本：${a.cost}`, { x: ax, y: 0.88, w: 2.2, h: 0.45, fontSize: 11, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
    s.addText(a.ic, { x: ax, y: 1.38, w: 2.2, h: 0.45, fontSize: 24, align: "center", fontFace: FONT_BODY });
    s.addText(a.t, { x: ax, y: 1.85, w: 2.2, h: 0.35, fontSize: 12, bold: true, color: C.teal, fontFace: FONT_BODY, align: "center" });
    s.addText(a.d, { x: ax + 0.1, y: 2.22, w: 2.0, h: 1.15, fontSize: 9.5, color: C.light, fontFace: FONT_BODY, align: "center", valign: "middle" });
  });

  // 扩展方向
  card(s, 0.45, 3.72, 9.1, 0.9, C.tealDeep);
  s.addText("扩展方向", { x: 0.55, y: 3.72, w: 1.5, h: 0.9, fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY, valign: "middle" });
  s.addText("API 测试框架 skill（计划中）  ·  Notion 知识库归档  ·  多项目并行验证  ·  用例执行结果→缺陷截图一键关联", {
    x: 1.9, y: 3.72, w: 7.45, h: 0.9, fontSize: 11, color: C.light, fontFace: FONT_BODY, valign: "middle"
  });

  s.addText("建议试点：软件部其他 QA 各选 1 个项目试跑 1 个迭代，对比「用例编写工时 + 缺陷报告工时」台账", {
    x: 0.45, y: 4.78, w: 9.1, h: 0.38,
    fontSize: 11, color: C.muted, fontFace: FONT_BODY, align: "center", italic: true
  });

  footer(s, 16, 18, "第五部分：推广建议");
}

// ── 第17页：风险与规划 ───────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.navy);
  topBar(s);
  bottomBar(s);

  s.addText("风险应对与后续规划", {
    x: 0.45, y: 0.18, w: 9.1, h: 0.55,
    fontSize: 24, bold: true, color: C.white, fontFace: FONT_TITLE, margin: 0
  });

  // 左侧：风险
  card(s, 0.45, 0.9, 4.3, 3.5, C.card);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 0.9, w: 4.3, h: 0.42, fill: { color: C.red }, line: { color: C.red } });
  s.addText("⚠  风险与应对", { x: 0.45, y: 0.9, w: 4.3, h: 0.42, fontSize: 14, bold: true, color: C.white, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  const risks = [
    { r: "AI 识别偏差", a: "人工确认闸门（用例审核/Bug确认）" },
    { r: "外部系统变更", a: "MCP/脚本独立维护，与业务解耦" },
    { r: "敏感信息泄露", a: "webhook 等配置不入库，handoff 已 gitignore" },
  ];
  risks.forEach((risk, i) => {
    const ry = 1.42 + i * 0.92;
    s.addText(`⚡ ${risk.r}`, { x: 0.6, y: ry, w: 4.0, h: 0.32, fontSize: 11, bold: true, color: C.warn, fontFace: FONT_BODY });
    s.addText(`→ ${risk.a}`, { x: 0.6, y: ry + 0.32, w: 4.0, h: 0.45, fontSize: 10, color: C.light, fontFace: FONT_BODY });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: 0.6, y: ry + 0.82, w: 4.0, h: 0, line: { color: C.tealDark, pt: 0.3 } });
  });

  // 右侧：年度投入 + 后续3个月
  card(s, 5.2, 0.9, 4.35, 3.5, C.tealDeep);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 0.9, w: 4.35, h: 0.42, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("📅  年度投入 & 后续规划", { x: 5.2, y: 0.9, w: 4.35, h: 0.42, fontSize: 13, bold: true, color: C.darkBg, fontFace: FONT_TITLE, align: "center", valign: "middle", margin: 0 });
  s.addText("年度工具投入  ¥1,380", { x: 5.35, y: 1.42, w: 4.05, h: 0.35, fontSize: 14, bold: true, color: C.warn, fontFace: FONT_TITLE });
  s.addText("Cursor 教育版 ¥400  +  Coding Plan ¥980", { x: 5.35, y: 1.78, w: 4.05, h: 0.3, fontSize: 10, color: C.muted, fontFace: FONT_BODY });
  s.addShape(pres.shapes.LINE, { x: 5.35, y: 2.15, w: 4.05, h: 0, line: { color: C.tealDark, pt: 0.3 } });
  s.addText("后续 3 个月计划", { x: 5.35, y: 2.22, w: 4.05, h: 0.32, fontSize: 11, bold: true, color: C.teal, fontFace: FONT_BODY });
  const plans = [
    "① 用例→缺陷执行结果一键关联",
    "② 多项目并行验证，沉淀 plan.md 模板",
    "③ 补充 API 自动化测试 skill 联动",
    "④ 定时任务已落地：定时拉缺陷→自动质量播报→推钉钉",
  ];
  plans.forEach((p, i) => {
    s.addText(p, { x: 5.35, y: 2.58 + i * 0.38, w: 4.05, h: 0.35, fontSize: 10, color: i === 3 ? C.accent : C.light, fontFace: FONT_BODY });
  });

  footer(s, 17, 18, "第六部分：其他说明");
}

// ── 第18页：封底 ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkBg(s, C.darkBg);
  topBar(s, C.teal);
  bottomBar(s, C.teal);
  leftBar(s, C.teal);

  // 装饰圆
  s.addShape(pres.shapes.OVAL, {
    x: 6.5, y: -1.2, w: 5.5, h: 5.5,
    fill: { color: C.tealDeep, transparency: 60 },
    line: { color: C.teal, pt: 1 }
  });

  // 核心价值
  s.addText("核心价值回顾", { x: 0.5, y: 0.7, w: 7, h: 0.38, fontSize: 12, bold: true, color: C.teal, fontFace: FONT_BODY });
  const values = [
    { ic: "💰", t: "千元级工具投入" },
    { ic: "⛓", t: "写用例+缺陷+报告全链路提效" },
    { ic: "⏱", t: "每迭代节省 6～8 小时+" },
    { ic: "🎯", t: "QA 回归质量本职" },
  ];
  values.forEach((v, i) => {
    card(s, 0.5 + i * 2.35, 1.18, 2.15, 0.9, C.card);
    s.addText(v.ic, { x: 0.5 + i * 2.35, y: 1.2, w: 0.7, h: 0.86, fontSize: 20, align: "center", fontFace: FONT_BODY, valign: "middle" });
    s.addText(v.t, { x: 1.15 + i * 2.35, y: 1.2, w: 1.4, h: 0.86, fontSize: 10, bold: true, color: C.light, fontFace: FONT_BODY, valign: "middle" });
  });

  // 主 Slogan
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.3, w: 8.8, h: 0.08, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("AI 不是替代测试，", {
    x: 0.5, y: 2.5, w: 8.8, h: 0.72,
    fontSize: 28, bold: true, color: C.white, fontFace: FONT_TITLE, align: "center", margin: 0
  });
  s.addText("是把测试从写表格里解放出来，去做真正有价值的质量设计。", {
    x: 0.5, y: 3.18, w: 8.8, h: 0.6,
    fontSize: 20, bold: true, color: C.teal, fontFace: FONT_TITLE, align: "center", margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.82, w: 8.8, h: 0.08, fill: { color: C.teal }, line: { color: C.teal } });

  // 落款
  s.addText("童美娜  ·  软件部  ·  测试工程师", { x: 0.5, y: 4.1, w: 6, h: 0.35, fontSize: 13, color: C.muted, fontFace: FONT_BODY });
  s.addText("Q & A  /  期待您的反馈", { x: 0.5, y: 4.52, w: 6, h: 0.35, fontSize: 13, color: C.teal, fontFace: FONT_BODY });
}

// ── 输出文件 ────────────────────────────────────────────────
const outFile = "C:/Users/33606/Desktop/AI先锋赛-QA提效助手.pptx";
pres.writeFile({ fileName: outFile }).then(() => {
  console.log("✅ PPT 已生成：" + outFile);
}).catch(err => {
  console.error("❌ 生成失败：", err);
});
