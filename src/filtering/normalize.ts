import type { CandidateEvent, SourceItem, Theme } from "../domain/types.js";

function classifyTheme(text: string): Theme {
  const lower = text.toLowerCase();

  if (/(sec|regulat|stablecoin|custody|etf|reserve|redemption)/.test(lower)) {
    return "regulation";
  }

  if (/(ethereum|l2|validator|client|infrastructure|payment|custody)/.test(lower)) {
    return "infrastructure";
  }

  if (/(exploit|hack|security|vulnerability|risk)/.test(lower)) {
    return "security";
  }

  if (/(market structure|liquidity|flow|fund|etf|volume)/.test(lower)) {
    return "marketStructure";
  }

  if (/(ai|agent|compute|model|crypto)/.test(lower)) {
    return "aiCrypto";
  }

  return "other";
}

export function normalizeSourceItems(items: SourceItem[], now: Date, windowHours: number): CandidateEvent[] {
  const cutoffMs = now.getTime() - windowHours * 60 * 60 * 1000;

  return items
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoffMs)
    .map((item) => {
      const text = `${item.title}\n${item.summary}\n${item.rawText}`;

      return {
        id: item.id,
        title: item.title,
        canonicalUrl: item.url,
        sources: [{ source: item.source, url: item.url, publishedAt: item.publishedAt }],
        publishedAt: item.publishedAt,
        summary: item.summary,
        theme: classifyTheme(text),
        isDuplicate: false,
        initialReason: "within configured time window"
      };
    });
}
