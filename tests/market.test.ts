import { describe, expect, it } from "vitest";
import { fetchMarketSnapshot } from "../src/market/marketSnapshot.js";

describe("fetchMarketSnapshot", () => {
  it("returns BTC and ETH market data from CoinGecko-shaped response", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          bitcoin: { usd: 61000, usd_24h_change: 1.25 },
          ethereum: { usd: 3400, usd_24h_change: -0.8 }
        }),
        { status: 200 }
      );

    const result = await fetchMarketSnapshot({
      apis: [{ id: "coingecko", enabled: true, timeoutMs: 5000 }],
      now: new Date("2026-06-28T02:00:00.000Z"),
      fetchImpl
    });

    expect(result).toMatchObject({
      btcUsd: 61000,
      ethUsd: 3400,
      btcChange24h: 1.25,
      ethChange24h: -0.8,
      degraded: false
    });
  });

  it("returns degraded snapshot when market API fails", async () => {
    const fetchImpl = async () => new Response("bad gateway", { status: 502 });

    const result = await fetchMarketSnapshot({
      apis: [{ id: "coingecko", enabled: true, timeoutMs: 5000 }],
      now: new Date("2026-06-28T02:00:00.000Z"),
      fetchImpl
    });

    expect(result.degraded).toBe(true);
    expect(result.trendSummary).toBe("Market API unavailable; package keeps only verifiable news context.");
    expect(result.degradationReason).toBe("coingecko failed: HTTP 502");
  });
});
