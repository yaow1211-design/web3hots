# Technical Design

## Architecture

The bot is a local Node.js/TypeScript CLI with isolated modules for:

- configuration loading and validation;
- domain types;
- RSS source parsing and fixed-source fetching;
- event normalization, deduplication, scoring, and selection;
- degraded/live market snapshot construction;
- core and social package building;
- local run persistence and logging;
- direct Feishu OpenAPI delivery;
- CLI orchestration.

OpenClaw may later trigger the CLI, but OpenClaw is not part of the v1 runtime.

## Data Flow

`daily-core`:

1. Load config and secrets.
2. Fetch enabled fixed RSS sources.
3. Normalize raw source items into candidates.
4. Filter stale items and deduplicate repeated coverage.
5. Score candidates and select the highest-signal non-rejected events.
6. Fetch market snapshot, allowing degraded output.
7. Build `CorePack` JSON and Markdown.
8. Save local files.
9. Append Markdown to Feishu and send DM.
10. Rewrite `core.json` with Feishu delivery results.

`daily-social-pack`:

1. Load config and current-day `core.json`.
2. Fail if `core.json` is absent.
3. Select 1-2 best content topics from the core pack.
4. Build prompt packages for Xiaohongshu, Chinese X, and English X.
5. Save local files.
6. Append prompt packages to Feishu and send DM.
7. Rewrite `social-pack.json` with delivery results.

## Interfaces

- `loadConfig(options?: { rootDir?: string; miaConfigPath?: string; envPath?: string }): Promise<AppConfig>`
- `parseRssItems(params: { xml: string; source: SourceConfig; fetchedAt: string }): SourceItem[]`
- `fetchFixedSources(params: { sources: SourceConfig[]; now: Date; fetchImpl?: typeof fetch }): Promise<FetchSourcesResult>`
- `normalizeSourceItems(items: SourceItem[], now: Date, windowHours: number): CandidateEvent[]`
- `dedupeCandidates(candidates: CandidateEvent[]): CandidateEvent[]`
- `scoreCandidates(candidates: CandidateEvent[], config: DefaultConfig): ScoredEvent[]`
- `selectEvents(events: ScoredEvent[], target: number): ScoredEvent[]`
- `fetchMarketSnapshot(params: { apis: MarketApiConfig[]; now: Date; fetchImpl?: typeof fetch }): Promise<MarketSnapshot>`
- `buildCorePack(params: BuildCorePackParams): CorePack`
- `renderCorePackMarkdown(pack: CorePack): string`
- `buildSocialPack(params: BuildSocialPackParams): SocialPack`
- `renderSocialPackMarkdown(pack: SocialPack): string`
- `getRunPaths(rootDir: string, date: string): RunPaths`
- `writeJsonFile(path: string, value: unknown): Promise<void>`
- `writeTextFile(path: string, content: string): Promise<void>`
- `readCorePack(path: string): Promise<CorePack>`
- `createFeishuClient(params: { appId: string; appSecret: string; client?: unknown }): FeishuClient`
- `runDailyCore(params?: RunDailyCoreParams): Promise<CorePack>`
- `runDailySocialPack(params?: RunDailySocialPackParams): Promise<SocialPack>`

## Failure Handling

- Source failure records source health and continues.
- Market API failure produces a degraded `MarketSnapshot` and continues.
- Feishu document failure preserves local files and reports structured failure.
- Feishu DM failure preserves local files and records structured failure.
- Missing `core.json` for social flow throws `Missing core package for <date>. Run daily-core first.`

## Testing Boundary

- Unit and orchestration tests mock network and Feishu.
- Live Feishu delivery is a manual integration check only.
- TDD evidence is required for every task: failing focused test first, passing focused test after implementation.
