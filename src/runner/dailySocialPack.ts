import { access } from "node:fs/promises";
import { join } from "node:path";
import type { CorePack, FeishuWriteResult, SocialPack } from "../domain/types.js";
import type { FeishuClient } from "../feishu/client.js";
import { loadConfig } from "../config/loadConfig.js";
import { createFeishuClient } from "../feishu/client.js";
import {
  buildSocialPack,
  renderSocialOpenClawPrompt,
  renderSocialPackMarkdown,
  renderXDocumentMarkdown,
  renderXiaohongshuDocumentMarkdown
} from "../package-builder/socialPack.js";
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

function writeResultLine(label: string, result?: FeishuWriteResult): string {
  if (!result) {
    return `${label}: unavailable`;
  }

  return result.ok
    ? `${label}: ${result.url ?? result.docToken}`
    : `${label}: delivery failed: ${result.error ?? "unknown error"}`;
}

function formatDmText(params: {
  date: string;
  materialResult?: FeishuWriteResult;
  xiaohongshuResult: FeishuWriteResult;
  xResult: FeishuWriteResult;
}): string {
  const writesOk = (params.materialResult?.ok ?? false) && params.xiaohongshuResult.ok && params.xResult.ok;

  return [
    writesOk
      ? `已更新的 3 个文档链接 | ${params.date}`
      : `已更新的 3 个文档链接 degraded | ${params.date}`,
    writeResultLine("Mia 素材库", params.materialResult),
    writeResultLine("Mia 小红书内容", params.xiaohongshuResult),
    writeResultLine("Mia X 内容", params.xResult)
  ].join("\n");
}

function skippedDeliveryReason(corePack: CorePack): string | null {
  const errors = [
    corePack.feishuWriteResult?.error,
    corePack.dmResult?.error
  ].filter((error): error is string => Boolean(error));

  return errors.find((error) =>
    error.includes("Feishu delivery skipped") ||
    error.includes("below selection.min") ||
    error.includes("selection.min")
  ) ?? null;
}

function coreReadinessFailure(corePack: CorePack): string | null {
  if (corePack.status === "failed") {
    return corePack.feishuWriteResult?.error ?? corePack.dmResult?.error ?? "core package status is failed";
  }

  return skippedDeliveryReason(corePack);
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
    try {
      await access(paths.coreJson);
    } catch {
      throw new Error(`Missing core package for ${date}. Run daily-core first.`);
    }

    const corePack = await readCorePack(paths.coreJson);
    const readinessFailure = coreReadinessFailure(corePack);

    if (readinessFailure) {
      throw new Error(`Core package for ${date} is not ready for social delivery: ${readinessFailure}`);
    }

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
    const xiaohongshuResult = await feishu.appendMarkdown(config.mia.xiaohongshuDocToken, renderXiaohongshuDocumentMarkdown(pack));
    const xResult = await feishu.appendMarkdown(config.mia.xDocToken, renderXDocumentMarkdown(pack));
    const dmResult = await feishu.sendText(
      config.mia.feishuOpenId,
      formatDmText({
        date,
        materialResult: corePack.feishuWriteResult,
        xiaohongshuResult,
        xResult
      })
    );
    const openClawPromptDmResult = xiaohongshuResult.ok && xResult.ok
      ? await feishu.sendText(config.mia.feishuOpenId, renderSocialOpenClawPrompt(pack))
      : undefined;

    pack = {
      ...pack,
      feishuWriteResults: [xiaohongshuResult, xResult],
      dmResult,
      openClawPromptDmResult
    };
    await writeJsonFile(paths.socialJson, pack);
    await appendLog(
      logPath,
      `daily-social-pack finished status=${xiaohongshuResult.ok && xResult.ok && dmResult.ok && (openClawPromptDmResult?.ok ?? true) ? "ok" : "degraded"}`
    );

    return pack;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog(logPath, `daily-social-pack finished status=failed reason="${message}"`);
    throw error;
  }
}
