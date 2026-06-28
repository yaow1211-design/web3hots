import type { MarketApiConfig, MarketSnapshot } from "../domain/types.js";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

type CoinGeckoResponse = {
  bitcoin?: { usd?: number; usd_24h_change?: number };
  ethereum?: { usd?: number; usd_24h_change?: number };
};

export async function fetchMarketSnapshot(params: {
  apis: MarketApiConfig[];
  now: Date;
  fetchImpl?: typeof fetch;
}): Promise<MarketSnapshot> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const errors: string[] = [];

  for (const api of params.apis) {
    if (!api.enabled) {
      continue;
    }

    if (api.id !== "coingecko") {
      errors.push(`${api.id} unsupported`);
      continue;
    }

    try {
      const response = await fetchImpl(COINGECKO_URL, {
        signal: AbortSignal.timeout(api.timeoutMs)
      });

      if (!response.ok) {
        errors.push(`${api.id} failed: HTTP ${response.status}`);
        continue;
      }

      const data = (await response.json()) as CoinGeckoResponse;
      if (typeof data.bitcoin?.usd !== "number" || typeof data.ethereum?.usd !== "number") {
        errors.push(`${api.id} failed: missing required BTC or ETH USD`);
        continue;
      }

      return {
        btcUsd: data.bitcoin.usd,
        ethUsd: data.ethereum.usd,
        btcChange24h: data.bitcoin?.usd_24h_change,
        ethChange24h: data.ethereum?.usd_24h_change,
        trendSummary: `BTC ${formatChange(data.bitcoin?.usd_24h_change)}, ETH ${formatChange(data.ethereum?.usd_24h_change)} over 24h.`,
        sources: ["coingecko"],
        degraded: false,
        fetchedAt: params.now.toISOString()
      };
    } catch (error) {
      errors.push(`${api.id} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    trendSummary: "Market API unavailable; package keeps only verifiable news context.",
    sources: [],
    degraded: true,
    degradationReason: errors[0] ?? "no enabled market API",
    fetchedAt: params.now.toISOString()
  };
}

function formatChange(value: number | undefined): string {
  if (typeof value !== "number") {
    return "change unavailable";
  }

  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}
