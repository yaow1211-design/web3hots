import type { CorePack, MiaConfig, SocialPack } from "../domain/types.js";
import { bullet } from "./markdown.js";

export interface BuildSocialPackParams {
  runId: string;
  date: string;
  corePack: CorePack;
  paths: { markdownPath: string; jsonPath: string };
  mia: MiaConfig;
}

export function buildSocialPack(params: BuildSocialPackParams): SocialPack {
  const selectedTopics = params.corePack.selectedEvents;
  const factBoundaries = [
    "Stick to facts already present in the core package.",
    "Do not add new claims, forecasts, or missing context.",
    "Keep the output clearly marked as draft social guidance."
  ];

  return {
    runId: params.runId,
    date: params.date,
    sourceCoreRunId: params.corePack.runId,
    selectedTopics,
    xiaohongshuPrompt: [
      "Write a 小红书 draft that reframes the selected topic for a Chinese-speaking audience.",
      "Keep it practical, concise, and grounded in the facts from the core package.",
      "Do not produce final publishable copy."
    ].join("\n"),
    chineseXPrompt: [
      "Write a 中文 X thread draft based on the selected topic.",
      "Keep it factual, readable, and suitable for a social-first summary.",
      "Do not produce final publishable copy."
    ].join("\n"),
    englishXPrompt: [
      "Write an English X thread draft based on the selected topic.",
      "Keep it factual, readable, and suitable for a social-first summary.",
      "Do not produce final publishable copy."
    ].join("\n"),
    factBoundaries,
    riskReminders: params.mia.riskReminders,
    markdownPath: params.paths.markdownPath,
    jsonPath: params.paths.jsonPath
  };
}

export function renderSocialPackMarkdown(pack: SocialPack): string {
  return [
    `# Social Package | ${pack.date}`,
    "",
    `Run ID: ${pack.runId}`,
    `Source core run ID: ${pack.sourceCoreRunId}`,
    "",
    "## Selected topics",
    bullet(pack.selectedTopics.map((topic) => topic.title)),
    "",
    "## XiaoHongShu prompt",
    "```text",
    pack.xiaohongshuPrompt,
    "```",
    "",
    "## Chinese X prompt",
    "```text",
    pack.chineseXPrompt,
    "```",
    "",
    "## English X prompt",
    "```text",
    pack.englishXPrompt,
    "```",
    "",
    "## Boundaries",
    bullet(pack.factBoundaries),
    "",
    "## Risk reminders",
    bullet(pack.riskReminders),
    "",
    "Draft only, not final publishable copy."
  ].join("\n");
}
