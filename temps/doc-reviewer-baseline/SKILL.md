---
name: doc-reviewer
description: >-
  Review existing testing-industry documents in Markdown, DOCX, PDF, or XLSX through four independent perspectives: test manager, project manager, product/business, and a non-testing reader. Use whenever the user asks to review, audit, proofread, quality-check, or revise a test plan, test strategy, test case set, execution record, defect report, test report, testing SOP, retrospective, or other testing document for rigor, typos, unclear wording, terminology drift, internal contradictions, inconsistent data or conclusions, cross-role misunderstanding, or plain-language readability. Also use when the user says a document feels unclear, inconsistent, not rigorous, or hard for other roles to understand. Do not use for creating a document from scratch, reviewing source code, validating external facts, building an OCR platform, auditing spreadsheet formulas, or enforcing CI gates.
compatibility: Reads Markdown directly; uses available DOCX, PDF, XLSX, or office inspection capabilities for read-only extraction. Independent reviewers require the Agent tool when available; otherwise run isolated sequential passes.
---

# Doc Reviewer

Audit an existing testing document as if it were independently read by a test manager and several non-testing stakeholders. The goal is not to produce more commentary. The goal is to expose places where the author and readers may believe they agree while actually understanding different things.

## Core promise

Review the document for five outcomes:

1. **Professional rigor** — the testing logic, scope, risk, status, conclusion, and next action are expressed precisely enough for the document's purpose.
2. **Internal consistency** — repeated facts, numbers, dates, statuses, terms, scope statements, and conclusions do not contradict each other.
3. **Language quality** — typos, awkward sentences, vague references, unexplained abbreviations, terminology drift, and ambiguous wording are identified.
4. **Cross-role comprehension** — different roles independently restate what they understood, so hidden interpretation differences become visible.
5. **Plain-language readability** — necessary testing terms remain accurate but are explained well enough for non-testing readers.

This is a **document-internal review**. Do not claim that a number, result, defect status, or conclusion is externally true unless the user supplies an authoritative source and explicitly asks for cross-source verification.

## Non-goals

Do not drift into adjacent projects:

- Do not create an OCR platform. If text cannot be read reliably, report the unread region and stop making confident claims about it.
- Do not perform a spreadsheet formula audit. Formula results may be read as document content, but formula correctness is outside this skill.
- Do not turn the review into a visual-format or style-guide audit unless the user explicitly asks for that dimension.
- Do not build scores, CI gates, dashboards, or trend systems.
- Do not force every testing document into one fixed template.
- Do not rewrite facts or select an uncertain value on the author's behalf.

## Input contract

Accept one existing file path with one of these extensions:

- `.md` or plain text
- `.docx`
- `.pdf`
- `.xlsx`

If the user pastes document content instead of a file path, review the pasted content but state that location references will use headings and excerpts rather than file-native page, paragraph, or cell coordinates.

Infer the document purpose from its title, headings, tables, and wording. Ask for the purpose only when the applicable professional standard would materially change and the type is genuinely ambiguous.

Read [references/format-routing.md](references/format-routing.md) before extracting file content. Read [references/review-rubric.md](references/review-rubric.md) before launching the reviewers.

## Workflow

### 1. Protect the source

Treat the source file as read-only.

- Do not overwrite, annotate, accept tracked changes, recalculate, or save the source during review.
- Record the exact source path and format.
- If a later revision is requested, write a separate reviewed copy.
- If extraction is incomplete, state the unread scope. Never present a partial review as a complete review.

### 2. Build a location-aware content map

Extract the content while preserving enough structure to cite evidence:

- Markdown/text: heading and line or paragraph range.
- DOCX: heading, paragraph/table position, and exact excerpt.
- PDF: page number and exact excerpt.
- XLSX: sheet and cell/range.

Include headings, body text, tables, and visible labels relevant to meaning. Format-specific inspection exists to recover content and locations, not to start a separate format audit.

For a long document, review by section or sheet, then run a global consistency pass. Do not merely concatenate section summaries.

### 3. Build a compact consistency ledger

Before role review, extract only the facts needed for document-internal comparison:

- key conclusions and recommendations;
- scope and exclusions;
- counts, percentages, dates, versions, statuses, and severity labels;
- repeated entity names and testing terms;
- risks, unresolved items, owners, and next actions.

Use the ledger to find conflicts across distant sections. It is an internal reading aid, not a new user-facing platform.

### 4. Launch four independent reviews

When the Agent tool is available, launch all four reviewers in parallel. Give every reviewer the same source content and location map, but do not give them another reviewer's findings. Independence matters because prior opinions prime later readers and hide real comprehension differences.

If independent agents are unavailable, run four isolated sequential passes. Reset the role instructions for each pass and do not include previous findings in the next role's prompt.

Each reviewer must return structured findings using the schema in [references/review-rubric.md](references/review-rubric.md).

#### Test manager

Review professional rigor, testing logic, scope, risk, status, conclusion, internal consistency, and whether the document supports the decision it asks readers to make.

#### Project manager

First restate the document's main conclusion, current status, key risks, and next action. Then identify wording or missing context that could cause planning, ownership, delivery, or release decisions to be misunderstood.

#### Product/business reader

First restate the user/business impact, main conclusion, risks, and next action. Then identify testing language that does not explain what it means for the product or business.

#### Non-testing reader

First restate what the document is about, what happened, what remains risky, and what should happen next. Then identify jargon, long or vague sentences, hidden assumptions, or passages that require specialist knowledge to understand.

### 5. Compare understanding before deduplication

Preserve each non-testing role's independent restatement. Compare them with the source and with one another.

Treat a minority misunderstanding as evidence, not noise. Do not erase it because the other readers agreed. Record:

- what each role understood;
- where their interpretations diverged;
- which source passage enabled the divergence;
- the likely consequence of each interpretation.

### 6. Synthesize findings without inventing certainty

Classify every finding as exactly one of:

- **Confirmed error** — directly evidenced typo, arithmetic mismatch, terminology inconsistency, or explicit contradiction.
- **Expression risk** — wording is grammatically possible but may produce ambiguity, missing context, or role-dependent interpretation.
- **Author confirmation required** — the document permits multiple plausible meanings and the correct intent cannot be determined internally.

Deduplicate findings that cite the same root passage and reasoning. Preserve all affected roles on the merged finding.

When reviewers disagree:

1. prefer exact source evidence and explicit arithmetic or logical relationships;
2. distinguish different scopes before calling values contradictory;
3. retain a defensible minority misunderstanding as an expression risk;
4. move unresolved intent to author confirmation instead of choosing a convenient answer.

### 7. Produce the first-stage review

Use this order:

1. Overall judgment
2. Cross-role understanding comparison
3. Confirmed errors
4. Expression risks
5. Author-confirmation questions
6. Role-specific observations only when they add a unique point
7. Recommended revision priorities

Keep the report proportionate to the source. A short document should receive a short review, not a process dossier.

- Represent each root problem once. Attach all detecting roles and related excerpts to that single finding.
- Use one compact comparison table for the three non-testing restatements; do not repeat each restatement in full later.
- Do not restate the same contradiction in the overall judgment, a finding card, role notes, and the priority list. The summary names it; the finding card proves it; later sections only link to its ID.
- Group low-impact typos or terminology corrections when they share one rule. Keep decision-changing findings separate.
- Omit empty sections and optional commentary.
- Prefer the smallest set of findings that fully explains the document's real risks. Do not manufacture secondary issues to make every role appear equally productive.

Every finding must include:

- finding ID;
- classification;
- severity;
- exact location;
- exact source excerpt;
- detecting or affected roles;
- what is wrong or unclear;
- evidence and reasoning;
- possible misunderstanding or impact;
- recommended change;
- suggested replacement text when safe.

Never output vague advice such as “some wording should be improved” without citing the source and explaining the failure mode.

### 8. Clarify before resolving ambiguous intent

If any author-confirmation item would change a fact, number, scope, status, conclusion, or recommendation, pause before producing the final revised document.

Ask only decision-critical questions. Group related questions, quote the conflicting passages, and explain why the answer changes the revision. Do not ask the user to repeat information already present in the document.

If the user declines to clarify, produce a review report but leave explicit placeholders in the proposed revision. Do not silently guess.

### 9. Create a separate revised copy

After necessary clarification, produce a complete revised version that:

- preserves facts and the author's intended conclusion;
- fixes confirmed language errors;
- resolves confirmed internal contradictions using the user's answer or explicit source evidence;
- explains necessary testing terms at first use;
- makes conclusion, risk, impact, owner, and next action easier to identify;
- avoids unnecessary rewriting and does not flatten professional distinctions.

For a file input, write revisions under a sibling directory named `<source-stem>-review/`. Never overwrite the source. Include a change log mapping finding IDs to original and revised passages.

Use the appropriate document-format skill only to create the separate revised artifact. Keep the semantic revision identical to the approved text.

### 10. Run one light re-review

Review the revised version once for:

- unresolved confirmed contradictions;
- facts or conclusions changed unintentionally;
- new terminology or data inconsistencies introduced by editing;
- remaining cross-role misunderstanding;
- unresolved placeholders.

Do not enter an autonomous rewrite loop. Report residual items honestly.

## Severity

Use severity to order remediation, not to create a numeric score:

- **Blocker** — could reverse a release, acceptance, risk, ownership, or major status decision.
- **Major** — likely to produce a materially wrong understanding or leaves a professionally necessary statement unclear.
- **Minor** — localized typo, grammar, terminology, or clarity defect with limited decision impact.
- **Suggestion** — optional readability improvement that does not correct an error.

## Output behavior

For a review-only request, present the first-stage report in the conversation unless the user asks to save it.

For a completed revision workflow, use this artifact set when applicable:

```text
<source-stem>-review/
├── review-report.md
├── revised-content.md
├── change-log.md
└── revised.<original-extension>   # only when safely supported and requested
```

The Markdown revised content is the semantic source of truth. If native-format reconstruction is unavailable or unsafe, deliver the Markdown revision and state the limitation instead of pretending the original format was reproduced faithfully.

## Completion criteria

The review is complete only when:

- all readable sections, pages, tables, or sheets within scope were covered;
- every finding cites an exact source location and excerpt;
- independent role restatements are preserved;
- cross-role interpretation differences are explicitly compared;
- confirmed errors, expression risks, and author-confirmation items are separated;
- no external truth claim is presented without external evidence;
- the source file remains unchanged;
- any revised copy is traceable through finding IDs and a change log;
- the revised version received one light re-review.
