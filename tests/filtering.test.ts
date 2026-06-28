import { describe, expect, it } from "vitest";
import type { DefaultConfig } from "../src/domain/types.js";
import { dedupeCandidates } from "../src/filtering/dedupe.js";
import { normalizeSourceItems } from "../src/filtering/normalize.js";
import { scoreCandidates } from "../src/filtering/score.js";
import { selectEvents } from "../src/filtering/select.js";
import { sourceItems } from "./fixtures/source-items.js";

const config: DefaultConfig = {
  timezone: "Asia/Shanghai",
  defaultWindowHours: 24,
  outputDir: "runs",
  logFile: "logs/broadcast-bot.log",
  selection: { min: 1, target: 3 },
  sources: [
    { id: "cointelegraph", type: "rss", url: "https://cointelegraph.com/rss", enabled: true, credibility: 0.82 },
    { id: "decrypt", type: "rss", url: "https://decrypt.co/feed", enabled: true, credibility: 0.8 }
  ],
  marketApis: [],
  themeWeights: { regulation: 1.2, infrastructure: 1.1, security: 1.2, marketStructure: 1, aiCrypto: 1.1 }
};

describe("filtering pipeline", () => {
  it("filters stale items, dedupes same event, and rejects pure price prediction", () => {
    const normalized = normalizeSourceItems(sourceItems, new Date("2026-06-28T02:00:00.000Z"), 24);
    expect(normalized.map((item) => item.title)).not.toContain("Old protocol security report");

    const deduped = dedupeCandidates(normalized);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].sources).toHaveLength(2);

    const scored = scoreCandidates(deduped, config);
    const priceEvent = scored.find((event) => event.title.includes("Bitcoin price"));
    expect(priceEvent?.rejectionReason).toBe("low-signal price prediction");

    const selected = selectEvents(scored, 3);
    expect(selected).toHaveLength(1);
    expect(selected[0].theme).toBe("regulation");
    expect(selected[0].selectionReason).toContain("structural impact");
  });

  it("does not give a multi-source content boost for same-source duplicates", () => {
    const sameSourceItems = [
      {
        id: "cointelegraph:a",
        source: "cointelegraph",
        sourceType: "rss" as const,
        title: "SEC issues new stablecoin custody guidance",
        url: "https://cointelegraph.com/news/sec-stablecoin-custody-guidance-a",
        publishedAt: "2026-06-28T00:30:00.000Z",
        summary: "The guidance changes how custodians report reserve and redemption risk.",
        rawText: "SEC stablecoin custody reserve redemption risk",
        fetchedAt: "2026-06-28T02:00:00.000Z"
      },
      {
        id: "cointelegraph:b",
        source: "cointelegraph",
        sourceType: "rss" as const,
        title: "SEC issues new stablecoin custody guidance update",
        url: "https://cointelegraph.com/news/sec-stablecoin-custody-guidance-b",
        publishedAt: "2026-06-28T00:45:00.000Z",
        summary: "The regulator updated expectations for stablecoin custody disclosures.",
        rawText: "SEC regulator stablecoin custody disclosures reserve",
        fetchedAt: "2026-06-28T02:00:00.000Z"
      }
    ];

    const normalized = normalizeSourceItems(sameSourceItems, new Date("2026-06-28T02:00:00.000Z"), 24);
    const deduped = dedupeCandidates(normalized);
    const scored = scoreCandidates(deduped, config);

    expect(scored).toHaveLength(1);
    expect(scored[0].sources).toHaveLength(2);
    expect(scored[0].contentPotentialScore).toBe(0.65);
  });

  it("does not reject a legitimate structural event that only mentions timing", () => {
    const timingEvent = [
      {
        id: "cointelegraph:timing",
        source: "cointelegraph",
        sourceType: "rss" as const,
        title: "SEC guidance update expected this week",
        canonicalUrl: "https://cointelegraph.com/news/sec-guidance-update-this-week",
        sources: [{ source: "cointelegraph", url: "https://cointelegraph.com/news/sec-guidance-update-this-week", publishedAt: "2026-06-28T00:30:00.000Z" }],
        publishedAt: "2026-06-28T00:30:00.000Z",
        summary: "The regulator is expected to publish custody guidance this week.",
        theme: "regulation" as const,
        isDuplicate: false,
        initialReason: "within configured time window"
      }
    ];

    const scored = scoreCandidates(timingEvent, config);

    expect(scored[0].rejectionReason).toBeUndefined();
  });

  it("does not reject a structural item that mentions price words without prediction language", () => {
    const structuralPriceEvent = [
      {
        id: "cointelegraph:price-structure",
        source: "cointelegraph",
        sourceType: "rss" as const,
        title: "SEC targets stablecoin price disclosure this week",
        canonicalUrl: "https://cointelegraph.com/news/sec-targets-stablecoin-price-disclosure",
        sources: [{ source: "cointelegraph", url: "https://cointelegraph.com/news/sec-targets-stablecoin-price-disclosure", publishedAt: "2026-06-28T00:30:00.000Z" }],
        publishedAt: "2026-06-28T00:30:00.000Z",
        summary: "The regulator targets disclosure rules for stablecoin price reporting this week.",
        theme: "regulation" as const,
        isDuplicate: false,
        initialReason: "within configured time window"
      }
    ];

    const scored = scoreCandidates(structuralPriceEvent, config);

    expect(scored[0].rejectionReason).toBeUndefined();
  });

  it("does not mutate the input candidate sources when deduping", () => {
    const input = normalizeSourceItems([
      {
        id: "cointelegraph:dedupe-a",
        source: "cointelegraph",
        sourceType: "rss" as const,
        title: "SEC issues new stablecoin custody guidance",
        url: "https://cointelegraph.com/news/sec-stablecoin-custody-guidance-a",
        publishedAt: "2026-06-28T00:30:00.000Z",
        summary: "The guidance changes how custodians report reserve and redemption risk.",
        rawText: "SEC stablecoin custody reserve redemption risk",
        fetchedAt: "2026-06-28T02:00:00.000Z"
      },
      {
        id: "decrypt:dedupe-b",
        source: "decrypt",
        sourceType: "rss" as const,
        title: "New stablecoin custody guidance lands from SEC",
        url: "https://decrypt.co/sec-stablecoin-custody-guidance-b",
        publishedAt: "2026-06-28T00:45:00.000Z",
        summary: "The regulator updated expectations for stablecoin custody disclosures.",
        rawText: "SEC regulator stablecoin custody disclosures reserve",
        fetchedAt: "2026-06-28T02:00:00.000Z"
      }
    ], new Date("2026-06-28T02:00:00.000Z"), 24);

    const originalSources = input.map((candidate) => candidate.sources);
    const deduped = dedupeCandidates(input);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].sources).toHaveLength(2);
    expect(input[0].sources).toBe(originalSources[0]);
    expect(input[1].sources).toBe(originalSources[1]);
    expect(input[0].sources).toHaveLength(1);
    expect(input[1].sources).toHaveLength(1);
  });
});
