const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
  ExternalHyperlink, TabStopType, TabStopPosition,
} = require("docx");

// ---------- Config ----------
const FONT = "Microsoft YaHei";
const FONT_MONO = "Consolas";
const PAGE_WIDTH = 11906; // A4
const PAGE_HEIGHT = 16838;
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9026

// ---------- Markdown Parser ----------
function parseInline(text) {
  const runs = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: 21 }));
    }
    if (m[2]) {
      // bold
      runs.push(new TextRun({ text: m[2], font: FONT, size: 21, bold: true }));
    } else if (m[3]) {
      // inline code
      runs.push(new TextRun({ text: m[3], font: FONT_MONO, size: 20, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }));
    } else if (m[4] && m[5]) {
      // link
      runs.push(new ExternalHyperlink({
        children: [new TextRun({ text: m[4], font: FONT, size: 21, color: "0563C1", underline: {} })],
        link: m[5],
      }));
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), font: FONT, size: 21 }));
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text: text, font: FONT, size: 21 }));
  }
  return runs;
}

function makeParagraph(text, opts = {}) {
  return new Paragraph({
    ...opts,
    children: parseInline(text),
  });
}

function parseTable(lines) {
  const rows = lines.map(line => {
    return line.split("|").map(c => c.trim()).filter((c, i, arr) => {
      // remove empty first/last from leading/trailing |
      if (i === 0 && c === "") return false;
      if (i === arr.length - 1 && c === "") return false;
      return true;
    });
  });
  // Remove separator row (|---|---|)
  const dataRows = rows.filter(r => !r.every(c => /^[-:]+$/.test(c)));
  if (dataRows.length === 0) return null;

  const numCols = dataRows[0].length;
  const colWidth = Math.floor(CONTENT_WIDTH / numCols);
  const columnWidths = Array(numCols).fill(colWidth);
  // Adjust last column to fill exactly
  columnWidths[numCols - 1] = CONTENT_WIDTH - colWidth * (numCols - 1);

  const border = { style: BorderStyle.SINGLE, size: 1, color: "B0B0B0" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const tableRows = dataRows.map((cells, rowIdx) => {
    const isHeader = rowIdx === 0;
    return new TableRow({
      tableHeader: isHeader,
      children: cells.map((cellText, colIdx) => new TableCell({
        borders,
        width: { size: columnWidths[colIdx], type: WidthType.DXA },
        shading: isHeader ? { fill: "4472C4", type: ShadingType.CLEAR } : (rowIdx % 2 === 0 ? { fill: "F2F6FC", type: ShadingType.CLEAR } : undefined),
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          children: parseInline(cellText).map(r => {
            // Style header cells
            if (isHeader) {
              if (r.constructor.name === "ExternalHyperlink") {
                return r;
              }
              r.options = r.options || {};
              // Recreate with white bold
              return new TextRun({ text: r.options.text || "", font: FONT, size: 20, bold: true, color: "FFFFFF" });
            }
            // Adjust font size for table cells
            if (r.constructor.name === "ExternalHyperlink") {
              return r;
            }
            const newTextRun = new TextRun({ ...r.options, size: 20 });
            return newTextRun;
          }),
        })],
      })),
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: tableRows,
  });
}

function parseMarkdown(md) {
  const lines = md.split("\n");
  const elements = [];
  let i = 0;

  // Counters for numbering references
  let bulletRefCounter = 0;
  let numRefCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      i++;
      continue;
    }

    // Title (H1)
    if (/^# /.test(line)) {
      elements.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 300 },
        children: [new TextRun({ text: line.replace(/^# /, ""), font: FONT, size: 40, bold: true, color: "1F3864" })],
      }));
      i++;
      continue;
    }

    // H2
    if (/^## /.test(line)) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 180 },
        children: [new TextRun({ text: line.replace(/^## /, ""), font: FONT, size: 30, bold: true, color: "1F3864" })],
      }));
      i++;
      continue;
    }

    // H3
    if (/^### /.test(line)) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 140 },
        children: [new TextRun({ text: line.replace(/^### /, ""), font: FONT, size: 26, bold: true, color: "2E75B6" })],
      }));
      i++;
      continue;
    }

    // H4
    if (/^#### /.test(line)) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: line.replace(/^#### /, ""), font: FONT, size: 23, bold: true, color: "4472C4" })],
      }));
      i++;
      continue;
    }

    // Block quote
    if (/^> /.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^> /.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^> /, ""));
        i++;
      }
      const quoteText = quoteLines.join(" ");
      elements.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        indent: { left: 400 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: "4472C4", space: 8 } },
        shading: { fill: "F2F6FC", type: ShadingType.CLEAR },
        children: parseInline(quoteText),
      }));
      continue;
    }

    // Code block
    if (/^```/.test(line.trim())) {
      const lang = line.trim().replace(/^```/, "");
      i++;
      const codeLines = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      // Mermaid diagram - render as styled text block
      if (lang === "mermaid") {
        elements.push(new Paragraph({
          spacing: { before: 120, after: 120 },
          indent: { left: 200, right: 200 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "4472C4", space: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "4472C4", space: 4 },
            left: { style: BorderStyle.SINGLE, size: 4, color: "4472C4", space: 4 },
            right: { style: BorderStyle.SINGLE, size: 4, color: "4472C4", space: 4 },
          },
          shading: { fill: "EDF3FC", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Mermaid 流程图]", font: FONT, size: 20, bold: true, color: "4472C4" })],
        }));
        codeLines.forEach(cl => {
          elements.push(new Paragraph({
            spacing: { before: 20, after: 20 },
            indent: { left: 200, right: 200 },
            shading: { fill: "EDF3FC", type: ShadingType.CLEAR },
            children: [new TextRun({ text: cl, font: FONT_MONO, size: 18, color: "333333" })],
          }));
        });
        elements.push(new Paragraph({
          spacing: { before: 40, after: 120 },
          indent: { left: 200, right: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "4472C4", space: 4 } },
          shading: { fill: "EDF3FC", type: ShadingType.CLEAR },
          children: [],
        }));
      } else {
        // Regular code block
        codeLines.forEach(cl => {
          elements.push(new Paragraph({
            spacing: { before: 10, after: 10 },
            indent: { left: 200, right: 200 },
            shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
            children: [new TextRun({ text: cl || " ", font: FONT_MONO, size: 18, color: "333333" })],
          }));
        });
      }
      continue;
    }

    // Table
    if (/^\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        elements.push(table);
        elements.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
      }
      continue;
    }

    // Bullet list
    if (/^[-*] /.test(line)) {
      const bulletRef = `bullets_${bulletRefCounter++}`;
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      items.forEach(item => {
        elements.push(new Paragraph({
          numbering: { reference: bulletRef, level: 0 },
          children: parseInline(item),
        }));
      });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const numRef = `numbers_${numRefCounter++}`;
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      items.forEach(item => {
        elements.push(new Paragraph({
          numbering: { reference: numRef, level: 0 },
          children: parseInline(item),
        }));
      });
      continue;
    }

    // Regular paragraph
    elements.push(makeParagraph(line));
    i++;
  }

  return elements;
}

// ---------- Main ----------
const mdContent = fs.readFileSync(
  "C:\\Users\\33606\\Desktop\\skills\\skill\\mcp\\output\\Graphify测试工程技术调研报告.md",
  "utf-8"
);

const children = parseMarkdown(mdContent);

// Build numbering configs
const numberingConfig = [];
for (let idx = 0; idx < 50; idx++) {
  numberingConfig.push({
    reference: `bullets_${idx}`,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  });
  numberingConfig.push({
    reference: `numbers_${idx}`,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 21 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: FONT, color: "4472C4" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: { config: numberingConfig },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Graphify 测试工程技术调研报告", font: FONT, size: 16, color: "999999" })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "第 ", font: FONT, size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
            new TextRun({ text: " 页", font: FONT, size: 16, color: "999999" }),
          ],
        })],
      }),
    },
    children: children,
  }],
});

const outputPath = "C:\\Users\\33606\\Desktop\\skills\\skill\\mcp\\output\\Graphify测试工程技术调研报告.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Done! Output:", outputPath);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
