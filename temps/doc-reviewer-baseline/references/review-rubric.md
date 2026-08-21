# Doc Reviewer — Review Rubric

Use this rubric to keep the four independent reviews comparable without making them identical.

## Contents

1. Finding schema
2. Classification and severity
3. Role contracts
4. Cross-role comprehension comparison
5. Professional lenses by testing-document purpose
6. False-positive controls
7. Proportionality and deduplication
8. Synthesis template

## 1. Finding schema

Every reviewer returns findings in this shape:

```markdown
### [Finding ID] Short title
- Classification: Confirmed error | Expression risk | Author confirmation required
- Severity: Blocker | Major | Minor | Suggestion
- Location: format-native location
- Source excerpt: exact quotation
- Detecting role: Test manager | Project manager | Product/business | Non-testing reader
- Affected roles: one or more roles
- Finding: precise statement of the problem
- Evidence: internal text, arithmetic, terminology, or interpretation evidence
- Possible misunderstanding or impact: concrete consequence
- Recommended change: actionable correction
- Suggested text: safe replacement, or `Await author confirmation`
```

Do not report a finding without an exact excerpt unless extraction genuinely failed. Extraction failure is a coverage limitation, not a document defect.

## 2. Classification and severity

### Confirmed error

Use only when the document itself proves the defect, for example:

- an obvious typo or malformed sentence;
- the same term refers to the same object with inconsistent names;
- totals or percentages do not reconcile under the stated scope;
- two passages make mutually exclusive claims about the same scope and time;
- the conclusion contradicts an explicit unresolved blocker;
- a referenced section, sheet, owner, or action does not exist in the document.

### Expression risk

Use when a reasonable reader can misinterpret the text even though one intended reading may be valid, for example:

- undefined abbreviation or specialist term;
- vague quantifier such as “all,” “basically,” “some,” or “normal” without scope;
- pronoun or subject with multiple possible referents;
- conclusion and evidence use different granularity;
- a role can state a plausible but wrong next action after reading the passage;
- necessary context is implied rather than written.

### Author confirmation required

Use when the correct revision depends on intent that cannot be recovered internally, for example:

- two values might represent different scopes but neither scope is named;
- “completed” might mean execution completed or quality accepted;
- a risk may be accepted, deferred, or unresolved, but the document does not say which;
- the intended target audience or requested decision is genuinely unclear.

### Severity

| Severity | Decision rule |
|---|---|
| Blocker | A plausible reading could reverse a release, acceptance, risk, ownership, or major status decision. |
| Major | A likely misunderstanding materially changes scope, priority, impact, or next action. |
| Minor | A localized language, terminology, or consistency defect with limited decision impact. |
| Suggestion | Optional improvement; the current wording remains correct and understandable. |

Severity is impact, not reviewer confidence. Keep classification and severity separate.

## 3. Role contracts

### Test manager

Read as the professional owner of testing quality. Check:

- Is the purpose of the document clear?
- Are test scope, exclusions, status, risks, and conclusions internally consistent?
- Does the evidence stated in the document support its own conclusion?
- Are unresolved defects, blocked items, residual risks, owners, and next actions explicit when relevant?
- Are terms and metrics used consistently?
- Does the document distinguish execution completion from quality acceptance?
- Is a missing section truly required by this document's purpose, rather than merely common in another template?

Do not validate external test truth unless authoritative evidence is supplied.

### Project manager

Before finding defects, independently restate:

1. Current status
2. Main conclusion
3. Delivery or schedule risk
4. Owner and next action

Then check whether a project decision-maker could misunderstand scope, milestone, dependency, responsibility, or release readiness.

### Product/business reader

Before finding defects, independently restate:

1. Product or business impact
2. Main conclusion
3. User-facing or operational risk
4. Recommended action

Then check whether testing language is connected to product consequences. Preserve technical accuracy; request explanation rather than deleting necessary terms.

### Non-testing reader

Before finding defects, independently restate:

1. What the document is about
2. What happened
3. What remains uncertain or risky
4. What should happen next

Then identify jargon, hidden assumptions, long sentences, unclear subjects, unexplained status labels, and passages that require specialist background.

## 4. Cross-role comprehension comparison

Create a table:

| Question | Project manager understood | Product/business understood | Non-testing reader understood | Source-supported meaning | Divergence |
|---|---|---|---|---|---|
| Main conclusion | ... | ... | ... | ... | None / Explain |
| Current status | ... | ... | ... | ... | None / Explain |
| Main risk | ... | ... | ... | ... | None / Explain |
| Next action | ... | ... | ... | ... | None / Explain |

A divergence is reportable when:

- at least one interpretation is plausible from the wording;
- the different interpretation could change a decision or action; or
- the target role cannot identify the answer from the document.

Do not suppress a minority interpretation. The purpose is to find misunderstanding paths, not to elect a majority meaning.

## 5. Professional lenses by testing-document purpose

Use these as adaptable questions, not mandatory templates.

### Planning and strategy documents

- Is the objective and in/out scope explicit?
- Are assumptions, dependencies, risks, resources, schedule, and entry/exit conditions understandable?
- Can readers distinguish planned coverage from guaranteed coverage?
- Are owners and decision points clear?

### Test cases, checklists, and execution records

- Are preconditions, actions, expected results, actual results, and status distinguishable where relevant?
- Are steps and expected outcomes specific enough for another tester to reproduce?
- Do row, table, or sheet summaries reconcile with detailed records under the same scope?
- Are blocked, skipped, not-run, and failed states used consistently?

### Defect, test, quality, acceptance, and release reports

- Can readers distinguish execution completion from product quality conclusion?
- Do totals, percentages, defect statuses, residual risks, and release recommendations agree internally?
- Is the conclusion supported by the evidence stated in the report?
- Are unresolved issues and next actions explicit?

### Standards, SOPs, manuals, and retrospectives

- Is the intended user and trigger condition clear?
- Are roles, prerequisites, steps, outcomes, exceptions, and rollback or escalation paths understandable where relevant?
- Can another person follow the instructions without hidden knowledge?
- Does the retrospective separate observation, cause, impact, action, owner, and follow-up?

## 6. False-positive controls

Before declaring a contradiction:

1. Confirm both passages refer to the same entity.
2. Confirm the time, version, environment, and scope are the same.
3. Confirm the unit and denominator are the same.
4. Distinguish a snapshot value from a cumulative value.
5. Distinguish execution status from quality or release status.
6. If any dimension is unnamed, classify as author confirmation or expression risk rather than a confirmed error.

Before declaring missing information:

1. Infer the document purpose.
2. Check whether the information exists under another heading, table, sheet, footnote, or appendix.
3. Ask whether the omission prevents the intended reader from making the intended decision.
4. Do not enforce a generic template over a valid project-specific structure.

Before rewriting:

1. Preserve numbers, scope, status, and conclusion unless evidence or the author resolves the conflict.
2. Keep necessary technical terms and explain them at first use.
3. Prefer local, traceable edits over stylistic reinvention.
4. Never turn a pending question into a confident fact.

## 7. Proportionality and deduplication

Apply these controls before writing the final report:

1. **One root issue, one finding.** Merge repeated role observations when they cite the same source and failure mode.
2. **Summaries point; findings prove.** The overall judgment names the top risks but does not reproduce their full evidence.
3. **The comparison table replaces repeated role essays.** Add role-specific notes only for genuinely unique insights.
4. **Questions follow root ambiguity.** Combine questions that are resolved by the same author decision instead of asking every downstream variation separately.
5. **Output length follows source complexity.** A four-paragraph document normally needs a compact report; a long multi-sheet document may justify more detail.
6. **Do not reward verbosity.** Completeness means every material risk is evidenced, not that every schema field is repeated in several sections.
7. **Do not force findings.** A role may report no unique issue after its independent restatement.

## 8. Synthesis template

```markdown
# Document Review

## 1. Overall judgment
- Professional rigor:
- Internal consistency:
- Cross-role comprehension:
- Plain-language readability:
- Coverage limitations:

## 2. Cross-role understanding
[comparison table]

## 3. Confirmed errors
[findings]

## 4. Expression risks
[findings]

## 5. Author confirmation required
[decision-critical questions with conflicting excerpts]

## 6. Unique role-specific observations (optional)
[Only points not already captured by a finding or the comparison table]

## 7. Revision priorities
1. Resolve decision-critical contradictions.
2. Clarify author-intent items.
3. Remove cross-role misunderstanding paths.
4. Correct language and terminology defects.
5. Apply optional readability suggestions.
```
