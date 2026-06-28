import type { CorePack, MarketSnapshot, MiaConfig, ScoredEvent } from "../domain/types.js";
import { bullet, sourceLinks } from "./markdown.js";

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

export function renderCorePackMarkdown(pack: CorePack): string {
  const selectedEvents = pack.selectedEvents
    .map((event, index) =>
      [
        `## ${index + 1}. ${event.title}`,
        "",
        `Theme: ${event.theme}`,
        `Published: ${event.publishedAt}`,
        `Sources: ${sourceLinks(event.sources)}`,
        "",
        `Summary: ${event.summary}`,
        "",
        `Why it matters: ${event.selectionReason ?? "High-signal event selected by score."}`,
        "",
        `Mia angle: This can become a practical lens on ${event.theme} rather than a headline recap.`,
        "",
        "Possible extension: turn this into an explainer, a risk note, or a platform-specific discussion prompt."
      ].join("\n")
    )
    .join("\n\n");
  const deliveryStatus = pack.feishuWriteResult
    ? pack.feishuWriteResult.ok
      ? `Feishu delivery ready: ${pack.feishuWriteResult.url ?? pack.feishuWriteResult.docToken}`
      : pack.feishuWriteResult.error ?? "Feishu delivery skipped."
    : "Feishu delivery pending.";

  return [
    `# Web3 Core Material Pack | ${pack.date}`,
    "",
    `Window: ${pack.window}`,
    `Run ID: ${pack.runId}`,
    "",
    "## Source health",
    bullet(
      pack.sourceHealth.map(
        (item) => `${item.source}: ${item.ok ? "ok" : "failed"} (${item.itemCount} items${item.error ? `, ${item.error}` : ""})`
      )
    ),
    "",
    "## Market snapshot",
    pack.marketSnapshot.degraded ? `Degraded: ${pack.marketSnapshot.degradationReason}` : pack.marketSnapshot.trendSummary,
    "",
    "## Delivery status",
    deliveryStatus,
    "",
    "## Selected events",
    selectedEvents || "No high-signal events selected.",
    "",
    "## Generation prompt",
    "```text",
    pack.generationPrompt,
    "```"
  ].join("\n");
}
