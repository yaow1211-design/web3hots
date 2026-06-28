import { describe, expect, it } from "vitest";
import { buildCorePack, renderCorePackMarkdown } from "../src/package-builder/corePack.js";
import { buildSocialPack, renderSocialPackMarkdown } from "../src/package-builder/socialPack.js";
import { event, mia } from "./fixtures/core-pack.js";

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

    expect(markdown).toContain("# Web3 Core Material Pack | 2026-06-28");
    expect(markdown).toContain("SEC issues new stablecoin custody guidance");
    expect(markdown).toContain("Mia angle");
    expect(markdown).toContain("Generation prompt");
    expect(pack.generationPrompt).toContain("Create a concise Web3 brief");
  });

  it("builds a social prompt package from the core package", () => {
    const core = buildCorePack({
      runId: "core-2026-06-28",
      date: "2026-06-28",
      window: "24h",
      selectedEvents: [event],
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

    expect(social.selectedTopics).toHaveLength(1);
    expect(social.xiaohongshuPrompt).toContain("小红书");
    expect(social.chineseXPrompt).toContain("中文 X thread");
    expect(social.englishXPrompt).toContain("English X thread");
    expect(markdown).toContain("not final publishable copy");
  });
});
