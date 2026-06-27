# Implementation Plan

Source plan: `/Users/wangmia/.openclaw/workspace/docs/superpowers/plans/2026-06-28-openclaw-broadcast-bot.md`.

Execute the source plan task-by-task with Superpowers Subagent-Driven Development and Trellis TDD workflow.

## Task Order

1. Project scaffold, scripts, shared types, and config loader.
2. RSS source parsing and fixed source fetching.
3. Candidate normalization, deduplication, scoring, and selection.
4. Market snapshot with degradation.
5. Core and social package builders.
6. Run paths, local persistence, and logging.
7. Feishu OpenAPI client with mocked delivery tests.
8. Daily core orchestration and CLI command.
9. Daily social package orchestration and CLI command.
10. Documentation, manual integration commands, and full verification.

## Per-Task Rules

- Read `prd.md`, `design.md`, this file, `.trellis/workflow.md`, `.trellis/spec/backend/index.md`, and `.trellis/spec/guides/index.md` before editing.
- Start each behavior slice with a failing focused test.
- Run the focused test and record the expected failure.
- Implement the minimum code to pass.
- Run the focused test and record the passing result.
- Run `npm run typecheck` when TypeScript interfaces change.
- Commit each task separately.
- Do not run live Feishu delivery as part of automated tests.
- Do not add LLM calls, final social-copy generation, public posting, weekly reports, alert jobs, or on-demand chat triggers.

## Final Verification

Run:

```bash
npm test
npm run typecheck
npm run build
git check-ignore .env config/mia.json runs/2026-06-28/core.json logs/broadcast-bot.log
```

Expected:

- tests pass;
- typecheck passes;
- build passes;
- ignored paths are printed;
- no secrets or generated run artifacts are tracked.
