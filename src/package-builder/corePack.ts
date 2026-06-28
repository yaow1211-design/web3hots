import type { CorePack, MarketSnapshot, MiaConfig, ScoredEvent } from "../domain/types.js";
import { bullet, dailyUpdateHeader, sourceLinks } from "./markdown.js";

export interface BuildCorePackParams {
  runId: string;
  date: string;
  window: string;
  selectedEvents: ScoredEvent[];
  sourceHealth: CorePack["sourceHealth"];
  marketSnapshot: MarketSnapshot;
  paths: { markdownPath: string; jsonPath: string };
  mia: MiaConfig;
}

export function buildCorePack(params: BuildCorePackParams): CorePack {
  return {
    runId: params.runId,
    date: params.date,
    window: params.window,
    sourceHealth: params.sourceHealth,
    selectedEvents: params.selectedEvents,
    marketSnapshot: params.marketSnapshot,
    generationPrompt: [
      "Create a concise Web3 brief from the material package below.",
      "Separate confirmed facts from interpretation.",
      "Focus on why each item matters to Mia's Web3 / AI opportunity lens.",
      "Do not imply investment advice."
    ].join("\n"),
    markdownPath: params.paths.markdownPath,
    jsonPath: params.paths.jsonPath
  };
}

function themeLabel(theme: ScoredEvent["theme"]): string {
  const labels: Record<ScoredEvent["theme"], string> = {
    regulation: "监管 / 合规",
    infrastructure: "基础设施",
    security: "安全 / 风险",
    marketStructure: "市场结构",
    aiCrypto: "AI x Crypto",
    other: "其他"
  };

  return labels[theme];
}

export function renderCorePackMarkdown(pack: CorePack): string {
  const selectedEvents = pack.selectedEvents
    .map((event, index) =>
      [
        `## ${index + 1}. ${event.title}`,
        "",
        `主题：${themeLabel(event.theme)}`,
        `发布时间：${event.publishedAt}`,
        `来源：${sourceLinks(event.sources)}`,
        "",
        `原始摘要：${event.summary}`,
        "",
        `一句话中文解读：这条素材属于${themeLabel(event.theme)}方向，重点看它对 Web3 叙事、用户信任、产品机会或风险判断的影响。`,
        "",
        `为什么重要：${event.selectionReason ?? "高信号事件，值得进入今日素材池。"}`,
        "",
        `Mia 角度：把它当成一个${themeLabel(event.theme)}切口，而不是只复述新闻标题。`,
        "",
        "可延展方向：解释背景、提炼风险、做平台差异化观点，或发展成小红书 / X 的内容角度。"
      ].join("\n")
    )
    .join("\n\n");
  const deliveryStatus = pack.feishuWriteResult
    ? pack.feishuWriteResult.ok
      ? `Feishu delivery ready: ${pack.feishuWriteResult.url ?? pack.feishuWriteResult.docToken}`
      : pack.feishuWriteResult.error ?? "Feishu delivery skipped."
    : "Feishu delivery pending.";

  return [
    ...dailyUpdateHeader(pack.date, "Web3 素材库 | Core Material Pack"),
    "",
    `时间窗口：${pack.window}`,
    `Run ID: ${pack.runId}`,
    "",
    "## 来源健康",
    bullet(
      pack.sourceHealth.map(
        (item) => `${item.source}: ${item.ok ? "ok" : "failed"} (${item.itemCount} items${item.error ? `, ${item.error}` : ""})`
      )
    ),
    "",
    "## 市场概览",
    pack.marketSnapshot.degraded ? `Degraded: ${pack.marketSnapshot.degradationReason}` : pack.marketSnapshot.trendSummary,
    "",
    "## 交付状态",
    deliveryStatus,
    "",
    "## 入选素材",
    selectedEvents || "暂无入选高信号素材。"
  ].join("\n");
}

export function renderCoreOpenClawPrompt(pack: CorePack): string {
  return [
    `OpenClaw prompt | Web3 素材库 | ${pack.date}`,
    "",
    pack.generationPrompt,
    "",
    "Use the selected material below as source context. Produce Chinese-first output for Mia. Keep facts and interpretation separated.",
    "",
    pack.selectedEvents
      .map((event, index) => `${index + 1}. ${event.title}\nSummary: ${event.summary}\nSources: ${sourceLinks(event.sources)}`)
      .join("\n\n")
  ].join("\n");
}
