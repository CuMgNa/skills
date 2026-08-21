# Doc Reviewer — Format Routing

Use format tools only to recover document content and reliable locations. The skill reviews meaning, rigor, internal consistency, and reader understanding; it is not a format-forensics platform.

## General extraction rules

1. Verify the file exists and record its extension.
2. Read without mutating the source.
3. Preserve headings, paragraphs, tables, sheets, cells, and page boundaries where available.
4. Track unread or truncated regions explicitly.
5. Do not call the review complete when extraction is incomplete.
6. For long inputs, process sections or sheets separately and then perform one global consistency pass.

## Markdown and plain text

Use the file Read capability.

Preserve:

- heading hierarchy;
- line or paragraph ranges;
- tables and lists;
- code or command blocks when they carry testing meaning.

Cite findings as `Heading > subheading, lines N-M` where line numbers are available. Otherwise use heading plus exact excerpt.

## DOCX

Load the available `officecli` or `docx` skill before inspection. Prefer read-only, high-level extraction.

Useful read-only routes include:

```text
officecli view <file> outline
officecli view <file> text
officecli view <file> annotated
officecli get <file> <path> --depth N --json
```

Inspect body text, headings, and tables. Include headers, footers, comments, or revision text only when they materially affect the current document meaning. Do not turn tracked-change history into a separate audit unless the user asks.

Do not use `set`, `add`, `remove`, tracked replacement, or any save operation during review.

Cite heading, paragraph/table location, stable element path when available, and exact excerpt.

## PDF

Use the PDF-reading capability or load the available `pdf` skill when extraction is difficult.

Preserve page numbers and table boundaries as far as the tool supports them.

If a page is image-only, scrambled, clipped, or otherwise unreadable:

- identify the affected page;
- state that its content could not be reviewed reliably;
- do not infer that it is blank;
- do not classify OCR-like artifacts as author typos without reliable evidence;
- do not issue a complete-document conclusion if material pages were unreadable.

This skill does not require building a new OCR pipeline. Use an already available OCR capability only when appropriate and clearly mark uncertainty.

Cite page number and exact excerpt.

## XLSX

Load the available `officecli` or `xlsx` skill before inspection. Use read-only extraction.

Review document meaning contained in:

- visible sheet names;
- headers and field labels;
- text and displayed values;
- test-case steps, expected/actual results, statuses, remarks, summaries, and conclusions;
- relationships between summary statements and detailed rows when they use the same stated scope.

Preserve sheet and cell/range locations. Treat merged cells carefully because one visible statement may span multiple coordinates.

Do not:

- save or modify the workbook;
- recalculate the workbook;
- refresh external links;
- execute macros;
- claim formula correctness;
- expand the task into hidden-sheet or workbook-forensics auditing unless the user asks.

Formula results may be cited as displayed document content. If a contradiction could be caused by calculation behavior rather than authored wording, classify it as author confirmation or a coverage limitation rather than a confirmed formula defect.

Cite `Sheet!Cell` or `Sheet!Range` and the displayed value or text.

## Pasted content

When the user pastes text rather than providing a file:

- review the content normally;
- use headings, paragraph order, tables, and exact excerpts for location;
- state that page, native paragraph, and cell references are unavailable;
- do not claim that omitted file regions were reviewed.

## Extraction failure

When a material region cannot be read, report:

```markdown
## Coverage limitation
- File/region:
- What could not be extracted:
- Why this affects the review:
- What evidence or alternate format would resolve it:
```

Do not output an unqualified overall “rigorous,” “consistent,” or “ready” judgment for content that was not actually read.
