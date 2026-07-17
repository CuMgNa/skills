const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        LevelFormat, PageBreak } = require('docx');

// ============================================================
// 模板样式参数（从 童美娜-2025个人年度总结.docx 解包分析得出）
// ============================================================
const STYLE = {
  titleFont: '宋体',
  titleFontEN: 'Times New Roman',
  titleSize: 28,       // 14pt (sz=28 in half-points)
  subtitleSize: 24,    // 12pt
  bodySize: 24,        // 12pt
  headingSize: 24,     // 12pt (H1/H2/H3 in template all use 24)
  lineHeight: 360,     // 1.5x line spacing (360 twips = 1.5 * 240)
  firstLineIndent: 420, // 首行缩进 420 DXA (~2字符)
  colorBlack: '000000',
  bulletIndent: 420,
  bulletHanging: 420,
};

// ============================================================
// 工具函数：解析 Markdown 内联格式（**bold**）为 TextRun 数组
// ============================================================
function parseInlineMd(text, baseOpts = {}) {
  const runs = [];
  // 用正则拆分 **bold** 和普通文本
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // 普通文本段
    if (match.index > lastIndex) {
      runs.push(...splitChineseEnglishRuns(text.slice(lastIndex, match.index), { ...baseOpts, bold: false }));
    }
    // bold段
    runs.push(...splitChineseEnglishRuns(match[1], { ...baseOpts, bold: true }));
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push(...splitChineseEnglishRuns(text.slice(lastIndex), { ...baseOpts, bold: false }));
  }
  return runs;
}

// 拆分中英文文本为独立 TextRun（中文用宋体，英文/数字用 Times New Roman）
function splitChineseEnglishRuns(text, opts = {}) {
  const runs = [];
  const segments = [];
  let current = '';
  let currentIsChinese = null;

  for (const ch of text) {
    const isChinese = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u2018-\u201d\u2014\u2015\u2026\u00b7]/.test(ch);
    if (currentIsChinese === null || currentIsChinese === isChinese) {
      current += ch;
      currentIsChinese = isChinese;
    } else {
      segments.push({ text: current, isChinese: currentIsChinese });
      current = ch;
      currentIsChinese = isChinese;
    }
  }
  if (current) segments.push({ text: current, isChinese: currentIsChinese });

  for (const seg of segments) {
    runs.push(new TextRun({
      text: seg.text,
      font: seg.isChinese ? STYLE.titleFont : STYLE.titleFontEN,
      size: opts.size || STYLE.bodySize,
      bold: opts.bold || false,
      color: opts.color || STYLE.colorBlack,
    }));
  }
  return runs;
}

// ============================================================
// 解析 Markdown 为文档段落
// ============================================================
function parseMdToDocx(mdText) {
  const lines = mdText.split('\n');
  const children = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 空行跳过
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 水平线 ---  → 空段落或跳过
    if (line.trim() === '---') {
      i++;
      continue;
    }

    // # 标题行 → 居中大标题
    if (line.startsWith('# ') && !line.startsWith('## ') && !line.startsWith('### ') && !line.startsWith('#### ')) {
      const titleText = line.replace(/^# /, '');
      // 去掉可能的 markdown bold标记
      const cleanTitle = titleText.replace(/\*\*(.+?)\*\*/g, '$1');
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: STYLE.lineHeight, lineRule: 'auto' },
        children: splitChineseEnglishRuns(cleanTitle, { size: STYLE.titleSize, bold: true }),
      }));
      i++;
      continue;
    }

    // ## H1 标题
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      const headingText = line.replace(/^## /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      children.push(new Paragraph({
        spacing: { line: STYLE.lineHeight, lineRule: 'auto', before: 200 },
        children: [
          ...splitChineseEnglishRuns(headingText, { size: STYLE.headingSize, bold: true }),
        ],
      }));
      i++;
      continue;
    }

    // ### H2 标题
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      const headingText = line.replace(/^### /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      children.push(new Paragraph({
        spacing: { line: STYLE.lineHeight, lineRule: 'auto', before: 160 },
        children: [
          ...splitChineseEnglishRuns(headingText, { size: STYLE.headingSize, bold: true }),
        ],
      }));
      i++;
      continue;
    }

    // #### H3 标题
    if (line.startsWith('#### ')) {
      const headingText = line.replace(/^#### /, '').replace(/\*\*(.+?)\*\*/g, '$1');
      children.push(new Paragraph({
        spacing: { line: STYLE.lineHeight, lineRule: 'auto', before: 120 },
        children: [
          ...splitChineseEnglishRuns(headingText, { size: STYLE.headingSize, bold: true }),
        ],
      }));
      i++;
      continue;
    }

    // 表格行
    if (line.trim().startsWith('|')) {
      // 收集整个表格块
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // 解析表格
      const table = parseMarkdownTable(tableLines);
      if (table) children.push(table);
      continue;
    }

    // 无序列表（- 开头）
    if (line.match(/^-\s/)) {
      const bulletText = line.replace(/^-\s/, '');
      // 处理带缩进的子列表
      const isSubBullet = line.match(/^  -\s/);
      children.push(new Paragraph({
        spacing: { line: STYLE.lineHeight, lineRule: 'auto' },
        numbering: { reference: isSubBullet ? 'bullets-sub' : 'bullets', level: 0 },
        children: parseInlineMd(bulletText),
      }));
      i++;
      continue;
    }

    // 引用块（> 开头）
    if (line.trim().startsWith('>')) {
      const quoteText = line.replace(/^>\s?/, '');
      children.push(new Paragraph({
        spacing: { line: STYLE.lineHeight, lineRule: 'auto' },
        indent: { left: 420 },
        children: parseInlineMd(quoteText),
      }));
      i++;
      continue;
    }

    // 普通段落
    const paraText = line;
    // 检测是否是加粗起始行（如 **姓名**：童美娜）
    const hasInlineBold = /\*\*(.+?)\*\*/.test(paraText);

    // 判断是否需要首行缩进：纯文本段落需要缩进，bold开头行也需要
    const needsIndent = !paraText.match(/^[\*\#\-|>]/);

    children.push(new Paragraph({
      spacing: { line: STYLE.lineHeight, lineRule: 'auto' },
      alignment: AlignmentType.JUSTIFIED,
      indent: needsIndent ? { firstLine: STYLE.firstLineIndent } : undefined,
      children: parseInlineMd(paraText),
    }));
    i++;
  }

  return children;
}

// ============================================================
// 解析 Markdown 表格为 docx-js Table
// ============================================================
function parseMarkdownTable(tableLines) {
  // 过滤掉分隔行（---）
  const dataLines = tableLines.filter(l => !l.match(/^\|[\s\-:]+\|$/));
  if (dataLines.length === 0) return null;

  const rowsData = dataLines.map(l => {
    return l.split('|').map(c => c.trim()).filter(c => c !== '');
  });

  const maxCols = Math.max(...rowsData.map(r => r.length));

  // 表格宽度：A4 9026 DXA（11906 - 左1440 - 右1440）
  const totalWidth = 9026;
  const colWidth = Math.floor(totalWidth / maxCols);

  const border = { style: BorderStyle.SINGLE, size: 4, color: 'auto' };
  const borders = { top: border, bottom: border, left: border, right: border };

  const tableRows = rowsData.map((row, rowIdx) => {
    const cells = [];
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const cellText = row[colIdx] || '';
      // 处理 <br> 拆分为多段落
      const cellParagraphs = cellText.split('<br>').map(part => {
        return new Paragraph({
          spacing: { line: STYLE.lineHeight, lineRule: 'auto' },
          children: parseInlineMd(part),
        });
      });

      cells.push(new TableCell({
        borders,
        width: { size: colWidth, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 108, right: 108 },
        children: cellParagraphs,
      }));
    }
    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: Array(maxCols).fill(colWidth),
    rows: tableRows,
  });
}

// ============================================================
// 生成文档
// ============================================================
const mdContent = fs.readFileSync('C:\\Users\\33606\\Desktop\\skills\\2026年年中总结-童美娜.md', 'utf-8');
const docChildren = parseMdToDocx(mdContent);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: STYLE.titleFont,
          size: STYLE.bodySize,
        },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: STYLE.bulletIndent, hanging: STYLE.bulletHanging } } },
        }],
      },
      {
        reference: 'bullets-sub',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u25E6',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: STYLE.bulletIndent * 2, hanging: STYLE.bulletHanging } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: {
          width: 11906,
          height: 16838,
        },
        margin: {
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      },
    },
    children: docChildren,
  }],
});

// 输出文件
const outputPath = 'C:\\Users\\33606\\Desktop\\skills\\2026年年中总结-童美娜-v3.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Document generated:', outputPath);
}).catch(err => {
  console.error('Error:', err);
});
