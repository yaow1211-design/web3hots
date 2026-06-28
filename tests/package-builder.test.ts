import { describe, expect, it } from "vitest";
import type { MiaConfig, ScoredEvent, SourceItem, Theme } from "../src/domain/types.js";
import { buildCorePack, renderCorePackMarkdown } from "../src/package-builder/corePack.js";
import { buildSocialPack, renderSocialPackMarkdown, renderXPromptMarkdown } from "../src/package-builder/socialPack.js";
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
  it("builds a core material package markdown with facts, Mia angle, and prompt", () => {
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
    expect(markdown).toContain("Mia angle");
    expect(markdown).toContain("Generation prompt");
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
    const xMarkdown = renderXPromptMarkdown(social);

    expect(social.selectedTopics).toHaveLength(2);
    expect(social.selectedTopics.map((topic) => topic.title)).toEqual([
      "Highest-potential market structure update",
      "Second-potential security report"
    ]);
    expect(social.factBoundaries).toEqual([
      'Only claim what sources support for "Highest-potential market structure update".',
      'Only claim what sources support for "Second-potential security report".'
    ]);
    expect(social.xiaohongshuPrompt).toContain("Highest-potential market structure update: A trader says Bitcoin may reach a new target.");
    expect(social.chineseXPrompt).toContain("Highest-potential market structure update: A trader says Bitcoin may reach a new target.");
    expect(social.englishXPrompt).toContain("Highest-potential market structure update: A trader says Bitcoin may reach a new target.");
    expect(social.xiaohongshuPrompt).toContain("# 6月28日 小红书草稿 | Web3 早报角度");
    expect(social.xiaohongshuPrompt).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(social.xiaohongshuPrompt.indexOf("## English")).toBeLessThan(social.xiaohongshuPrompt.indexOf("## 中文"));
    expect(social.xiaohongshuPrompt).toContain("小红书");
    expect(social.chineseXPrompt).toContain("中文 X thread");
    expect(social.englishXPrompt).toContain("English X thread");
    expect(social.xiaohongshuPrompt).toContain("Do not produce final publishable copy.");
    expect(social.chineseXPrompt).toContain("Do not produce final publishable copy.");
    expect(social.englishXPrompt).toContain("Do not produce final publishable copy.");
    expect(markdown).toContain("# 6月28日 Social Package | Web3 早报角度");
    expect(markdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(xMarkdown).toContain("# 6月28日 X 草稿 | Web3 早报角度");
    expect(xMarkdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(xMarkdown.indexOf("## English X prompt")).toBeLessThan(xMarkdown.indexOf("## 中文 X prompt"));
    expect(markdown).toContain("## Topic 1: Highest-potential market structure update");
    expect(markdown).toContain("Summary: A trader says Bitcoin may reach a new target.");
    expect(markdown).toContain("Sources: [cointelegraph](https://cointelegraph.com/news/bitcoin-price-target)");
    expect(markdown.indexOf("## English X prompt")).toBeLessThan(markdown.indexOf("## 中文 X prompt"));
    expect(markdown).toContain("not final publishable copy");
  });
});
