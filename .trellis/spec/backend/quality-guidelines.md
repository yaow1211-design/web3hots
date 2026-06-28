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

### Daily Feishu updates must use titled bilingual headers

Every daily update written to Feishu must start with a real Markdown heading that begins with the Chinese month/day form, like `# 6月28日 小红书草稿 | Web3 早报角度`.

After the title, include the English date label first and the Chinese label second:

```text
Date: June 28, 2026
日期：2026年6月28日
```

Required behavior:

- Core material Markdown must start with a dated title such as `# 6月28日 Web3 素材库 | Core Material Pack`.
- Feishu document content must be Chinese-readable material/content structure, not raw OpenClaw instructions or process notes.
- Xiaohongshu document content must start with a dated title such as `# 6月28日 小红书内容 | Web3 早报角度`.
- X document delivery must start with a dated title such as `# 6月28日 X 内容 | Web3 早报角度` and include `## English` before `## 中文`.
- Feishu document bodies must not include `OpenClaw prompt`, `Do not produce final publishable copy`, `草稿`, `非最终`, or similar process/non-final wording.
- After a full `daily-core` plus `daily-social-pack` run, Feishu DM delivery must send exactly two user-facing messages: one links summary containing the three updated document links, then one Social pack OpenClaw prompt.
- `daily-core` writes the core material document and local artifacts only; it must not send a Feishu DM.
- Only the Social pack OpenClaw prompt is sent by DM. Core OpenClaw prompts must not be DM'd.
- Markdown `#` and `##` headings must be converted to Feishu heading blocks, not plain text blocks.
- When top-inserting batches into Feishu with `index: 0`, send chunks in reverse chunk order but preserve the order within each chunk so the displayed document order matches the source Markdown.
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
