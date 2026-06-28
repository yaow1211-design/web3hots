import type { CorePack, MiaConfig, SocialPack } from "../domain/types.js";
import { bullet, dailyUpdateHeader, sourceLinks } from "./markdown.js";

export interface BuildSocialPackParams {
  runId: string;
  date: string;
  corePack: CorePack;
  paths: { markdownPath: string; jsonPath: string };
  mia: MiaConfig;
}

export function buildSocialPack(params: BuildSocialPackParams): SocialPack {
  const selectedTopics = [...params.corePack.selectedEvents].sort((a, b) => b.contentPotentialScore - a.contentPotentialScore).slice(0, 2);

  if (selectedTopics.length === 0) {
    throw new Error(
      `Core package for ${params.date} has no selected events. Re-run daily-core after enough events are selected.`
    );
  }

  const topicLines = selectedTopics.map((topic) => `${topic.title}: ${topic.summary}`).join("\n");
  const factBoundaries = selectedTopics.map((topic) => `Only claim what sources support for "${topic.title}".`);

  return {
    runId: params.runId,
    date: params.date,
    sourceCoreRunId: params.corePack.runId,
    selectedTopics,
    xiaohongshuPrompt: [
      ...dailyUpdateHeader(params.date, "小红书草稿 | Web3 早报角度"),
      "",
      "## English",
      "Write a Xiaohongshu draft angle that reframes the selected topic for a Chinese-speaking audience.",
      topicLines,
      "Keep it practical, concise, and grounded in the facts from the core package.",
      "Do not produce final publishable copy.",
      "",
      "## 中文",
      "请写一个面向中文受众的小红书草稿角度。",
      topicLines,
      "保持实用、简洁，并严格基于核心素材包里的事实。",
      "不要生成最终可发布正文。"
    ].join("\n"),
    chineseXPrompt: [
      "## 中文 X prompt",
      "Write a 中文 X thread draft based on the selected topic.",
      topicLines,
      "Keep it factual, readable, and suitable for a social-first summary.",
      "Do not produce final publishable copy."
    ].join("\n"),
    englishXPrompt: [
      "## English X prompt",
      "Write an English X thread draft based on the selected topic.",
      topicLines,
      "Keep it factual, readable, and suitable for a social-first summary.",
      "Do not produce final publishable copy."
    ].join("\n"),
    factBoundaries,
    riskReminders: params.mia.riskReminders,
    markdownPath: params.paths.markdownPath,
    jsonPath: params.paths.jsonPath
  };
}

export function renderXPromptMarkdown(pack: SocialPack): string {
  return [
    ...dailyUpdateHeader(pack.date, "X 草稿 | Web3 早报角度"),
    "",
    pack.englishXPrompt,
    "",
    pack.chineseXPrompt
  ].join("\n");
}

export function renderSocialPackMarkdown(pack: SocialPack): string {
  const topicSection = pack.selectedTopics
    .map((topic, index) =>
      [
        `## Topic ${index + 1}: ${topic.title}`,
        "",
        `Summary: ${topic.summary}`,
        `Sources: ${sourceLinks(topic.sources)}`
      ].join("\n")
    )
    .join("\n\n");

  return [
    ...dailyUpdateHeader(pack.date, "Social Package | Web3 早报角度"),
    "",
    `Run ID: ${pack.runId}`,
    `Source core run ID: ${pack.sourceCoreRunId}`,
    "",
    topicSection,
    "",
    "## XiaoHongShu prompt",
    "```text",
    pack.xiaohongshuPrompt,
    "```",
    "",
    "## English X prompt",
    "```text",
    renderXPromptMarkdown(pack),
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
