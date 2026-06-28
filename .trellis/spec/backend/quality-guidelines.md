# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

### Feishu document writes must be chunked

When writing generated Markdown to Feishu docx blocks, convert Markdown lines to plain text blocks and send at most 50 blocks per `documentBlockChildren.create` request.

Why: live Feishu docx writes reject large `children` arrays with `field validation failed` even when the same document token, app credentials, and a one-block diagnostic write succeed.

Required behavior:

- Small Markdown payloads may use a single request.
- Payloads over 50 non-empty lines must be split into `[50, 50, ...]` sized batches.
- When inserting new Markdown at the top of a Feishu doc, send chunked batches in reverse order with `index: 0` so the final document reads in the original line order.
- If any batch returns a non-zero Feishu response code, return the structured document write failure immediately.
- Unit tests must cover both the single-request path and the multi-request chunking path.

### Feishu document writes must keep newest runs first

Generated packages are chronological logs. Successful Feishu docx writes must insert the newest run at the top of the root document block with `data.index: 0`, not append to the bottom.

Why: Mia reads the three target docs as inbox-style work queues; newest daily material should be visible first without scrolling.

Required behavior:

- The core material document, Xiaohongshu draft document, and X draft document all use the same `appendMarkdown` top-insert behavior.
- Multi-batch writes must preserve the package's internal reading order after insertion.
- Unit tests must assert `index: 0` and cover multi-batch ordering.

### Daily Feishu updates must show bilingual dates

Every daily update written to Feishu must include the run date near the top of the written content. Use the English date label first and the Chinese label second:

```text
Date: YYYY-MM-DD
日期: YYYY-MM-DD
```

Required behavior:

- Core material Markdown must include the bilingual date lines near the top.
- Xiaohongshu prompt content must include the bilingual date lines because it is written directly to its own Feishu doc.
- X prompt content must include the bilingual date lines and write the English X prompt before the Chinese X prompt.
- Unit tests must cover both the rendered local Markdown and the actual strings passed to Feishu delivery.

### Feishu document links must be browser-openable

When returning a document link to the user after a successful Feishu docx write, build the URL with `https://my.feishu.cn/docx/<doc_token>`.

Why: `https://applink.feishu.cn/docx/<doc_token>` can resolve to an AppLink handoff page that Chrome reports as invalid, even when the document token and write operation are valid.

Required behavior:

- `FeishuWriteResult.url` must use the `my.feishu.cn` docx URL form.
- Unit tests for Feishu delivery must assert the returned URL domain.
- Do not log, commit, or print real doc tokens from local config while debugging links.

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
