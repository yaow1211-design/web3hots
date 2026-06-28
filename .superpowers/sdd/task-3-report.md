# Task 3 Report: Candidate Normalization, Deduplication, Scoring, and Selection

Date: 2026-06-28

## Scope

Implemented the filtering pipeline owned by this task:

- `src/filtering/normalize.ts`
- `src/filtering/dedupe.ts`
- `src/filtering/score.ts`
- `src/filtering/select.ts`
- `tests/fixtures/source-items.ts`
- `tests/filtering.test.ts`

## RED Evidence

Command:

```bash
npm test -- tests/filtering.test.ts
```

Result:

- Failed as expected because the filtering modules did not exist yet.
- Primary error:

```text
Error: Cannot find module '../src/filtering/dedupe.js' imported from '/Users/wangmia/openclaw-broadcast-bot/tests/filtering.test.ts'
```

## GREEN Evidence

Commands:

```bash
npm test -- tests/filtering.test.ts
npm run typecheck
```

Result:

- `tests/filtering.test.ts` passed.
- TypeScript typecheck passed with no errors.

## Commit

- `4021b7e feat: filter and score candidate events`

## Notes

- The implementation stays inside the task-owned filtering and fixture/test files.
- No RSS, market, CLI, Feishu, runner, package-builder, or live network logic was added.

# Fix Report: Unique Source Counting for Content Potential

Date: 2026-06-28

## Scope

Fixed the scoring bug where merged same-source duplicates were incorrectly treated as multi-source coverage for `contentPotentialScore`.

Changed files:

- `src/filtering/score.ts`
- `tests/filtering.test.ts`

## RED Evidence

Command:

```bash
npm test -- tests/filtering.test.ts
```

Result:

- Failed on the new regression assertion.
- Failure message:

```text
expected 0.85 to be 0.65 // Object.is equality
```

## GREEN Evidence

Commands:

```bash
npm test -- tests/filtering.test.ts
npm run typecheck
```

Result:

- `tests/filtering.test.ts` passed with the new same-source duplicate assertion.
- TypeScript typecheck passed with no errors.

# Fix Report: Narrow Price Prediction Rejection

Date: 2026-06-28

## Scope

Narrowed the price-prediction rejection rule so timing language by itself does not cause a rejection.

Changed files:

- `src/filtering/score.ts`
- `tests/filtering.test.ts`

## RED Evidence

Command:

```bash
npm test -- tests/filtering.test.ts
```

Result:

- Failed on the new timing-only regression assertion.
- Failure message:

```text
expected 'low-signal price prediction' to be undefined
```

## GREEN Evidence

Commands:

```bash
npm test -- tests/filtering.test.ts
npm run typecheck
```

Result:

- `tests/filtering.test.ts` passed after removing timing-only rejection.
- TypeScript typecheck passed with no errors.

# Fix Report: Tighten Filtering Edge Cases

Date: 2026-06-28

## Scope

Fixed two edge cases in the filtering pipeline:

- price-prediction rejection now requires prediction semantics instead of raw keyword presence
- dedupe now copies nested `sources` arrays before storing or merging

Changed files:

- `src/filtering/score.ts`
- `src/filtering/dedupe.ts`
- `tests/filtering.test.ts`

## RED Evidence

Command:

```bash
npm test -- tests/filtering.test.ts
```

Result:

- Failed on the new structural price-word regression assertion.
- Failed on the new dedupe aliasing regression assertion.

Failure messages:

```text
expected 'low-signal price prediction' to be undefined
expected [ …(2) ] to have a length of 1 but got 2
```

## GREEN Evidence

Commands:

```bash
npm test -- tests/filtering.test.ts
npm run typecheck
```

Result:

- `tests/filtering.test.ts` passed with all five filtering assertions green.
- TypeScript typecheck passed with no errors.
