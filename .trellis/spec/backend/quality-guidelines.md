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
- If any batch returns a non-zero Feishu response code, return the structured document write failure immediately.
- Unit tests must cover both the single-request path and the multi-request chunking path.

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
