import { describe, expect, it } from "vitest";
import type { MiaConfig, ScoredEvent, SourceItem, Theme } from "../src/domain/types.js";
import { buildCorePack, renderCorePackMarkdown } from "../src/package-builder/corePack.js";
import {
  buildSocialPack,
  renderSocialOpenClawPrompt,
  renderSocialPackMarkdown,
  renderXDocumentMarkdown,
  renderXiaohongshuDocumentMarkdown
} from "../src/package-builder/socialPack.js";
import { sourceItems } from "./fixtures/core-pack.js";

const mia: MiaConfig = {
  materialDocToken: "material_doc",
  xiaohongshuDocToken: "xhs_doc",
  xDocToken: "x_doc",
  feishuOpenId: "ou_test",
  priorityThemes: ["regulation", "infrastructure"],
  styleConstraints: ["signal over noise"],
  riskReminders: ["do not imply investment advice"]
};

function scoredEvent(
  item: SourceItem,
  overrides: { theme: Theme; contentPotentialScore: number; title?: string }
): ScoredEvent {
  return {
    id: item.id,
    title: overrides.title ?? item.title,
    canonicalUrl: item.url,
    sources: [{ source: item.source, url: item.url, publishedAt: item.publishedAt }],
    publishedAt: item.publishedAt,
    summary: item.summary,
    theme: overrides.theme,
    isDuplicate: false,
    initialReason: "within configured time window",
    credibilityScore: 0.82,
    timelinessScore: 1,
    impactScore: 0.9,
    miaAngleScore: 0.8,
    contentPotentialScore: overrides.contentPotentialScore,
    totalScore: 5.244,
    selectionReason: "selected for structural impact (0.9) and Mia angle (0.8)"
  };
}

const event = scoredEvent(sourceItems[0], {
  theme: "regulation",
  contentPotentialScore: 0.85,
  title: "SEC issues new stablecoin custody guidance"
});

describe("package builders", () => {
  it("builds a core material package markdown with facts and Mia angle without process prompts", () => {
    const pack = buildCorePack({
      runId: "core-2026-06-28",
      date: "2026-06-28",
      window: "24h",
      selectedEvents: [event],
      sourceHealth: [{ source: "cointelegraph", ok: true, itemCount: 1 }],
      marketSnapshot: {
        btcUsd: 61000,
        ethUsd: 3400,
        btcChange24h: 1.25,
        ethChange24h: -0.8,
        trendSummary: "BTC +1.25%, ETH -0.80% over 24h.",
        sources: ["coingecko"],
        degraded: false,
        fetchedAt: "2026-06-28T02:00:00.000Z"
      },
      paths: { markdownPath: "runs/2026-06-28/core.md", jsonPath: "runs/2026-06-28/core.json" },
      mia
    });

    const markdown = renderCorePackMarkdown(pack);

    expect(markdown).toContain("# 6月28日 Web3 素材库 | Core Material Pack");
    expect(markdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(markdown).toContain("SEC issues new stablecoin custody guidance");
    expect(markdown).toContain("## 入选素材");
    expect(markdown).toContain("一句话中文解读");
    expect(markdown).toContain("Mia 角度");
    expect(markdown).not.toContain("Generation prompt");
    expect(markdown).not.toContain("Create a concise Web3 brief");
    expect(pack.generationPrompt).toContain("Create a concise Web3 brief");
  });

  it("selects the top two social topics by content potential and creates topic fact boundaries", () => {
    const lowPotential = scoredEvent(sourceItems[1], {
      theme: "regulation",
      contentPotentialScore: 0.45,
      title: "Lower-potential custody update"
    });
    const highPotential = scoredEvent(sourceItems[2], {
      theme: "marketStructure",
      contentPotentialScore: 0.95,
      title: "Highest-potential market structure update"
    });
    const mediumPotential = scoredEvent(sourceItems[3], {
      theme: "security",
      contentPotentialScore: 0.7,
      title: "Second-potential security report"
    });
    const core = buildCorePack({
      runId: "core-2026-06-28",
      date: "2026-06-28",
      window: "24h",
      selectedEvents: [lowPotential, highPotential, mediumPotential],
      sourceHealth: [],
      marketSnapshot: { trendSummary: "degraded", sources: [], degraded: true, degradationReason: "API unavailable", fetchedAt: "2026-06-28T02:00:00.000Z" },
      paths: { markdownPath: "runs/2026-06-28/core.md", jsonPath: "runs/2026-06-28/core.json" },
      mia
    });
    const social = buildSocialPack({
      runId: "social-2026-06-28",
      date: "2026-06-28",
      corePack: core,
      paths: { markdownPath: "runs/2026-06-28/social-pack.md", jsonPath: "runs/2026-06-28/social-pack.json" },
      mia
    });

    const markdown = renderSocialPackMarkdown(social);
    const xiaohongshuDocument = renderXiaohongshuDocumentMarkdown(social);
    const xDocument = renderXDocumentMarkdown(social);
    const openClawPrompt = renderSocialOpenClawPrompt(social);

    expect(social.selectedTopics).toHaveLength(2);
    expect(social.selectedTopics.map((topic) => topic.title)).toEqual([
      "Highest-potential market structure update",
      "Second-potential security report"
    ]);
    expect(social.factBoundaries).toEqual([
      'Only claim what sources support for "Highest-potential market structure update".',
      'Only claim what sources support for "Second-potential security report".'
    ]);
    expect(xiaohongshuDocument).toContain("# 6月28日 小红书内容 | Web3 早报角度");
    expect(xiaohongshuDocument).toContain("## 中文内容");
    expect(xiaohongshuDocument).toContain("标题备选");
    expect(xiaohongshuDocument).not.toContain("Write a Xiaohongshu");
    expect(xiaohongshuDocument).not.toContain("Do not produce final publishable copy.");
    expect(xiaohongshuDocument).not.toContain("草稿");
    expect(xiaohongshuDocument).not.toContain("非最终");
    expect(xiaohongshuDocument).not.toContain("OpenClaw prompt");
    expect(xDocument).toContain("# 6月28日 X 内容 | Web3 早报角度");
    expect(xDocument.indexOf("## English")).toBeLessThan(xDocument.indexOf("## 中文"));
    expect(xDocument).not.toContain("Write an English X thread");
    expect(xDocument).not.toContain("Do not produce final publishable copy.");
    expect(xDocument).not.toContain("草稿");
    expect(xDocument).not.toContain("非最终");
    expect(xDocument).not.toContain("OpenClaw prompt");
    expect(markdown).toContain("# 6月28日 Social Package | Web3 早报角度");
    expect(markdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(markdown).not.toContain("XiaoHongShu prompt");
    expect(markdown).not.toContain("English X prompt");
    expect(markdown).not.toContain("草稿");
    expect(markdown).not.toContain("非最终");
    expect(markdown).not.toContain("OpenClaw prompt");
    expect(markdown).toContain("## Topic 1: Highest-potential market structure update");
    expect(markdown).toContain("中文角度");
    expect(openClawPrompt).toContain("OpenClaw prompt");
    expect(openClawPrompt).toContain("Write a Xiaohongshu draft");
    expect(openClawPrompt).toContain("Write an English X thread");
  });
});
