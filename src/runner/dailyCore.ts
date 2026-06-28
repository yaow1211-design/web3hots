import { join } from "node:path";
import type { CorePack, FeishuWriteResult, MarketApiConfig, MarketSnapshot, SourceItem } from "../domain/types.js";
import type { FeishuClient } from "../feishu/client.js";
import { loadConfig } from "../config/loadConfig.js";
import { createFeishuClient } from "../feishu/client.js";
import { dedupeCandidates } from "../filtering/dedupe.js";
import { normalizeSourceItems } from "../filtering/normalize.js";
import { scoreCandidates } from "../filtering/score.js";
import { selectEvents } from "../filtering/select.js";
import { fetchMarketSnapshot } from "../market/marketSnapshot.js";
import { buildCorePack, renderCoreOpenClawPrompt, renderCorePackMarkdown } from "../package-builder/corePack.js";
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

function belowSelectionMinMessage(selectedCount: number, min: number): string {
  return `selected events ${selectedCount} below selection.min ${min}`;
}

function dateKey(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatDmText(params: {
  date: string;
  selectedCount: number;
  feishuWriteResult: FeishuWriteResult;
  marketSnapshot: MarketSnapshot;
}): string {
  const docStatus = params.feishuWriteResult.ok
    ? `Doc: ${params.feishuWriteResult.url ?? params.feishuWriteResult.docToken}`
    : `Doc delivery failed: ${params.feishuWriteResult.error ?? "unknown error"}`;

  return [
    params.feishuWriteResult.ok
      ? `Web3 core material package ready: ${params.date}`
      : `Web3 core material package degraded: ${params.date}`,
    `Selected events: ${params.selectedCount}`,
    docStatus,
    params.marketSnapshot.degraded
      ? `Market module degraded: ${params.marketSnapshot.degradationReason ?? "unknown"}`
      : "Market module available"
  ].join("\n");
}

export async function runDailyCore(params: RunDailyCoreParams = {}): Promise<CorePack> {
  const rootDir = params.rootDir ?? process.cwd();
  const now = params.now ?? new Date();
  const config = await loadConfig({ rootDir });
  const date = dateKey(now, config.defaultConfig.timezone);
  const paths = getRunPaths(rootDir, date, config.defaultConfig.outputDir);
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
  const selectionMin = config.defaultConfig.selection.min;
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

  if (selectedEvents.length < selectionMin) {
    const reason = belowSelectionMinMessage(selectedEvents.length, selectionMin);

    pack = {
      ...pack,
      status: "failed",
      feishuWriteResult: {
        ok: false,
        docToken: config.mia.materialDocToken,
        error: `Feishu delivery skipped: ${reason}.`
      },
      dmResult: {
        ok: false,
        error: `Feishu delivery skipped: ${reason}.`
      }
    };
  }

  const markdown = renderCorePackMarkdown(pack);

  // Local artifacts must exist before any Feishu delivery attempt.
  await writeTextFile(paths.coreMarkdown, markdown);
  await writeJsonFile(paths.coreJson, pack);

  if (selectedEvents.length < selectionMin) {
    await appendLog(logPath, `daily-core finished status=failed reason="${belowSelectionMinMessage(selectedEvents.length, selectionMin)}"`);
    return pack;
  }

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
      feishuWriteResult,
      marketSnapshot
    })
  );
  const openClawPromptDmResult = feishuWriteResult.ok
    ? await feishu.sendText(config.mia.feishuOpenId, renderCoreOpenClawPrompt({ ...pack, feishuWriteResult, dmResult }))
    : undefined;

  pack = {
    ...pack,
    status: feishuWriteResult.ok && dmResult.ok && (openClawPromptDmResult?.ok ?? true) ? "ok" : "degraded",
    feishuWriteResult,
    dmResult,
    openClawPromptDmResult
  };
  await writeJsonFile(paths.coreJson, pack);
  await appendLog(
    logPath,
    `daily-core finished status=${feishuWriteResult.ok && dmResult.ok && (openClawPromptDmResult?.ok ?? true) ? "ok" : "degraded"}`
  );

  return pack;
}
