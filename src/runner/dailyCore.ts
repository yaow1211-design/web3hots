import { join } from "node:path";
import type { CorePack, MarketApiConfig, MarketSnapshot, SourceItem } from "../domain/types.js";
import type { FeishuClient } from "../feishu/client.js";
import { loadConfig } from "../config/loadConfig.js";
import { createFeishuClient } from "../feishu/client.js";
import { dedupeCandidates } from "../filtering/dedupe.js";
import { normalizeSourceItems } from "../filtering/normalize.js";
import { scoreCandidates } from "../filtering/score.js";
import { selectEvents } from "../filtering/select.js";
import { fetchMarketSnapshot } from "../market/marketSnapshot.js";
import { buildCorePack, renderCorePackMarkdown } from "../package-builder/corePack.js";
import { fetchFixedSources } from "../sources/fixedSources.js";
import { appendLog } from "../state/logger.js";
import { getRunPaths } from "../state/paths.js";
import { writeJsonFile, writeTextFile } from "../state/runStore.js";

export interface RunDailyCoreParams {
  rootDir?: string;
  now?: Date;
  fetchSources?: typeof fetchFixedSources;
  fetchMarket?: (params: { apis: MarketApiConfig[]; now: Date }) => Promise<MarketSnapshot>;
  feishuClient?: FeishuClient;
}

function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function formatDmText(params: { date: string; selectedCount: number; docTarget: string; marketSnapshot: MarketSnapshot }): string {
  return [
    `Web3 core material package ready: ${params.date}`,
    `Selected events: ${params.selectedCount}`,
    `Doc: ${params.docTarget}`,
    params.marketSnapshot.degraded
      ? `Market module degraded: ${params.marketSnapshot.degradationReason ?? "unknown"}`
      : "Market module available"
  ].join("\n");
}

export async function runDailyCore(params: RunDailyCoreParams = {}): Promise<CorePack> {
  const rootDir = params.rootDir ?? process.cwd();
  const now = params.now ?? new Date();
  const config = await loadConfig({ rootDir });
  const date = dateKey(now);
  const paths = getRunPaths(rootDir, date);
  const logPath = join(rootDir, config.defaultConfig.logFile);

  await appendLog(logPath, `daily-core started runDate=${date}`);

  const sourceResult = await (params.fetchSources ?? fetchFixedSources)({
    sources: config.defaultConfig.sources,
    now
  });
  const normalized = normalizeSourceItems(sourceResult.items as SourceItem[], now, config.defaultConfig.defaultWindowHours);
  const deduped = dedupeCandidates(normalized);
  const scored = scoreCandidates(deduped, config.defaultConfig);
  const selectedEvents = selectEvents(scored, config.defaultConfig.selection.target);
  const marketSnapshot = await (params.fetchMarket ?? fetchMarketSnapshot)({
    apis: config.defaultConfig.marketApis,
    now
  });

  let pack = buildCorePack({
    runId: `core-${date}-${now.getTime()}`,
    date,
    window: `${config.defaultConfig.defaultWindowHours}h`,
    selectedEvents,
    sourceHealth: sourceResult.health,
    marketSnapshot,
    paths: { markdownPath: paths.coreMarkdown, jsonPath: paths.coreJson },
    mia: config.mia
  });

  const markdown = renderCorePackMarkdown(pack);

  // Local artifacts must exist before any Feishu delivery attempt.
  await writeTextFile(paths.coreMarkdown, markdown);
  await writeJsonFile(paths.coreJson, pack);

  const feishu = params.feishuClient ??
    createFeishuClient({
      appId: config.env.FEISHU_APP_ID,
      appSecret: config.env.FEISHU_APP_SECRET
    });
  const feishuWriteResult = await feishu.appendMarkdown(config.mia.materialDocToken, markdown);
  const dmResult = await feishu.sendText(
    config.mia.feishuOpenId,
    formatDmText({
      date,
      selectedCount: selectedEvents.length,
      docTarget: feishuWriteResult.url ?? config.mia.materialDocToken,
      marketSnapshot
    })
  );

  pack = { ...pack, feishuWriteResult, dmResult };
  await writeJsonFile(paths.coreJson, pack);
  await appendLog(logPath, `daily-core finished status=${feishuWriteResult.ok && dmResult.ok ? "ok" : "degraded"}`);

  return pack;
}
