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

function topicLinesForDocument(pack: SocialPack): string[] {
  return pack.selectedTopics.flatMap((topic, index) => [
    `${index + 1}. ${topic.title}`,
    `原始摘要：${topic.summary}`,
    "中文角度：把这条素材转成用户能理解的 Web3 变化，而不是只解释价格或项目名。",
    `来源：${sourceLinks(topic.sources)}`,
    ""
  ]);
}

export function renderXiaohongshuDocumentMarkdown(pack: SocialPack): string {
  return [
    ...dailyUpdateHeader(pack.date, "小红书草稿 | Web3 早报角度"),
    "",
    "## 中文草稿骨架",
    "",
    "### 标题备选",
    bullet(pack.selectedTopics.map((topic) => `${topic.title}：这件事值得普通 Web3 观察者关注`)),
    "",
    "### 正文成稿",
    "今天的素材先围绕这些信号展开，重点不是复述新闻，而是把它们变成用户能看懂的机会、风险和判断框架。",
    "",
    ...topicLinesForDocument(pack),
    "## 收尾",
    "这不是投资建议，只是把今天值得跟踪的 Web3 信号整理成后续可写作的素材。"
  ].join("\n");
}

export function renderXDocumentMarkdown(pack: SocialPack): string {
  return [
    ...dailyUpdateHeader(pack.date, "X 草稿 | Web3 早报角度"),
    "",
    "## English",
    "",
    "Today's angle: turn the selected Web3 signals into a clear thread about what changed, why it matters, and what to watch next.",
    "",
    ...pack.selectedTopics.flatMap((topic, index) => [
      `${index + 1}. ${topic.title}`,
      `Source summary: ${topic.summary}`,
      "Use this as a signal, not as investment advice.",
      ""
    ]),
    "## 中文",
    "",
    "今天的角度：把入选 Web3 信号整理成一条清晰的中文线索，讲清楚发生了什么、为什么重要、接下来要看什么。",
    "",
    ...topicLinesForDocument(pack)
  ].join("\n");
}

export function renderSocialOpenClawPrompt(pack: SocialPack): string {
  return [
    `OpenClaw prompt | Social pack | ${pack.date}`,
    "",
    "Use the source facts below to produce Chinese-first drafts. Keep output grounded, do not invent claims, and keep final copy separate from source notes.",
    "",
    "## Xiaohongshu task",
    pack.xiaohongshuPrompt,
    "",
    "## English X task",
    pack.englishXPrompt,
    "",
    "## 中文 X task",
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
    "## 小红书文档预览",
    renderXiaohongshuDocumentMarkdown(pack),
    "",
    "## X 文档预览",
    renderXDocumentMarkdown(pack),
    "",
    "## Boundaries",
    bullet(pack.factBoundaries),
    "",
    "## Risk reminders",
    bullet(pack.riskReminders),
    "",
    "文档只保留素材与草稿骨架；OpenClaw prompt 会通过飞书私信单独发送。"
  ].join("\n");
}
