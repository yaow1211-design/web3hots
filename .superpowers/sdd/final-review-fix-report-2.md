Final Review Fix Report 2
=========================

Task
----
- Active task: /Users/wangmia/openclaw-broadcast-bot/.trellis/tasks/06-28-broadcast-bot-v1
- Commit hash: this commit; exact hash is generated after this file is committed and returned in the final response.

RED Evidence
------------
- Command: `npm test -- tests/daily-core.test.ts tests/daily-social-pack.test.ts tests/rss.test.ts`
- Result: failed as expected before production changes.
- Expected failures observed:
  - `runDailyCore > sends a degraded DM when the material document write fails`
    - Failure: DM text still said `Web3 core material package ready` and did not contain `doc failed`.
  - `runDailySocialPack > fails clearly when the saved core pack failed readiness and never calls Feishu`
    - Failure: promise resolved instead of rejecting from a failed below-min core artifact.
  - `runDailySocialPack > sends a degraded DM when social document writes fail`
    - Failure: DM text still said `Web3 social creation package ready` and did not contain degraded wording.
  - `fetchFixedSources > aborts stalled response bodies on timeout, records the failure, and continues to later sources`
    - Failure: test timed out because the timeout was cleared after `fetch()` resolved and before `response.text()` settled.

GREEN Evidence
--------------
- Command: `npm test -- tests/daily-core.test.ts tests/daily-social-pack.test.ts tests/rss.test.ts`
- Result: passed.
- Output summary: 3 test files passed, 12 tests passed.

- Command: `npm run typecheck`
- Result: passed.
- Output summary: `tsc -p tsconfig.json --noEmit` exited successfully.

Changed Files
-------------
- `src/domain/types.ts`
  - Added optional `CorePack.status` typed as `ok | degraded | failed`.
- `src/runner/dailyCore.ts`
  - Writes `status: "failed"` for below-min core runs.
  - Writes `status: "ok"` or `status: "degraded"` after Feishu delivery.
  - Formats core DM text as degraded when the material doc write fails and includes the document failure instead of presenting a failed doc token as ready.
- `src/runner/dailySocialPack.ts`
  - Rejects failed core artifacts before building or delivering a social pack.
  - Preserves compatibility with older below-min artifacts by detecting skipped/below-min delivery errors.
  - Formats social DM text as degraded when either social doc write fails and includes document failure details instead of presenting failed doc tokens as ready.
- `src/sources/fixedSources.ts`
  - Keeps the per-source abort timeout alive through `response.text()` and RSS parsing.
- `tests/daily-core.test.ts`
  - Added regression coverage for degraded core DM text on failed document write.
- `tests/daily-social-pack.test.ts`
  - Added regression coverage for rejecting failed core readiness with no Feishu calls.
  - Added regression coverage for degraded social DM text on failed document writes.
- `tests/rss.test.ts`
  - Added regression coverage for stalled response body timeout handling and continuation to later sources.
- `.superpowers/sdd/final-review-fix-report-2.md`
  - This report.

Residual Risks
--------------
- The RSS timeout can abort asynchronous fetch/body operations. It cannot preempt a CPU-bound synchronous XML parse once parsing has started.
- Older core artifacts without `status` are handled for below-min skipped delivery metadata, but other historical failure shapes may need explicit migration if they exist.
