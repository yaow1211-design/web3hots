# OpenClaw Broadcast Bot v1

## Goal

Build an independent Node.js/TypeScript CLI project that produces Web3 core material packages and social creation prompt packages, writes them to Feishu through Feishu OpenAPI, and notifies Mia.

## Requirements

- Project path: `/Users/wangmia/openclaw-broadcast-bot`.
- CLI commands:
  - `broadcast-bot daily-core`
  - `broadcast-bot daily-social-pack`
- `daily-core` must:
  - load `.env`, `config/default.json`, and `config/mia.json`;
  - fetch fixed RSS/API sources, not Brave Search as a critical dependency;
  - normalize, deduplicate, score, and select high-signal Web3 events;
  - include a fault-tolerant BTC/ETH market snapshot;
  - save local JSON and Markdown outputs before Feishu delivery;
  - append the core material package to `Mia 素材库`;
  - send Mia a Feishu DM with package status.
- `daily-social-pack` must:
  - read the saved current-day `core.json`;
  - fail clearly if `daily-core` has not run;
  - generate Xiaohongshu, Chinese X, and English X creation prompt packages;
  - append prompt packages to `Mia 小红书草稿箱` and `Mia X 草稿箱`;
  - send Mia a Feishu DM with package status.
- The first version must not:
  - call any LLM provider directly;
  - generate final publishable Xiaohongshu or X copy;
  - publish to X, Xiaohongshu, or any public channel;
  - implement weekly reports, failure-alert cron jobs, on-demand chat triggers, charts, screenshots, or uploaded images;
  - depend on OpenClaw's Feishu tool for delivery.
- `config/mia.json`, `.env`, `runs/`, and `logs/` must be gitignored.
- Live Feishu writes must not run in the default test suite.
- Every implementation slice must follow Trellis TDD: red test, confirmed failing run, implementation, confirmed passing run, then review/commit.

## Acceptance Criteria

- [ ] Trellis TDD workflow is initialized and committed.
- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `git check-ignore .env config/mia.json runs/2026-06-28/core.json logs/broadcast-bot.log` prints all four paths.
- [ ] Focused tests cover config loading, RSS parsing, filtering/scoring, market degradation, package building, local run persistence, mocked Feishu delivery, daily-core orchestration, and daily-social-pack orchestration.
- [ ] Default tests never perform live Feishu writes or send live Feishu messages.
- [ ] Final summary reports commits, changed behavior, verification commands, and remaining risks.
