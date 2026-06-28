import { access } from "node:fs/promises";
import { join } from "node:path";
import type { SocialPack } from "../domain/types.js";
import type { FeishuClient } from "../feishu/client.js";
import { loadConfig } from "../config/loadConfig.js";
import { createFeishuClient } from "../feishu/client.js";
import { buildSocialPack, renderSocialPackMarkdown } from "../package-builder/socialPack.js";
import { appendLog } from "../state/logger.js";
import { getRunPaths } from "../state/paths.js";
import { readCorePack, writeJsonFile, writeTextFile } from "../state/runStore.js";

export interface RunDailySocialPackParams {
  rootDir?: string;
  now?: Date;
  feishuClient?: FeishuClient;
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

function formatDmText(params: { date: string; selectedCount: number; xiaohongshuTarget: string; xTarget: string }): string {
  return [
    `Web3 social creation package ready: ${params.date}`,
    `Selected topics: ${params.selectedCount}`,
    `Xiaohongshu doc: ${params.xiaohongshuTarget}`,
    `X doc: ${params.xTarget}`,
    "These are creation prompts, not final publishable posts."
  ].join("\n");
}

export async function runDailySocialPack(params: RunDailySocialPackParams = {}): Promise<SocialPack> {
  const rootDir = params.rootDir ?? process.cwd();
  const now = params.now ?? new Date();
  const config = await loadConfig({ rootDir });
  const date = dateKey(now, config.defaultConfig.timezone);
  const paths = getRunPaths(rootDir, date, config.defaultConfig.outputDir);
  const logPath = join(rootDir, config.defaultConfig.logFile);

  await appendLog(logPath, `daily-social-pack started runDate=${date}`);

  try {
    await access(paths.coreJson);
  } catch {
    throw new Error(`Missing core package for ${date}. Run daily-core first.`);
  }

  const corePack = await readCorePack(paths.coreJson);
  let pack = buildSocialPack({
    runId: `social-${date}-${now.getTime()}`,
    date,
    corePack,
    paths: {
      markdownPath: paths.socialMarkdown,
      jsonPath: paths.socialJson
    },
    mia: config.mia
  });
  const markdown = renderSocialPackMarkdown(pack);

  // Local artifacts must exist before any Feishu delivery attempt.
  await writeTextFile(paths.socialMarkdown, markdown);
  await writeJsonFile(paths.socialJson, pack);

  const feishu = params.feishuClient ??
    createFeishuClient({
      appId: config.env.FEISHU_APP_ID,
      appSecret: config.env.FEISHU_APP_SECRET
    });
  const xiaohongshuResult = await feishu.appendMarkdown(config.mia.xiaohongshuDocToken, pack.xiaohongshuPrompt);
  const xResult = await feishu.appendMarkdown(
    config.mia.xDocToken,
    [pack.chineseXPrompt, "", pack.englishXPrompt].join("\n")
  );
  const dmResult = await feishu.sendText(
    config.mia.feishuOpenId,
    formatDmText({
      date,
      selectedCount: pack.selectedTopics.length,
      xiaohongshuTarget: xiaohongshuResult.url ?? config.mia.xiaohongshuDocToken,
      xTarget: xResult.url ?? config.mia.xDocToken
    })
  );

  pack = {
    ...pack,
    feishuWriteResults: [xiaohongshuResult, xResult],
    dmResult
  };
  await writeJsonFile(paths.socialJson, pack);
  await appendLog(
    logPath,
    `daily-social-pack finished status=${xiaohongshuResult.ok && xResult.ok && dmResult.ok ? "ok" : "degraded"}`
  );

  return pack;
}
