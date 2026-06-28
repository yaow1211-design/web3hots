import type { SourceConfig, SourceItem } from "../domain/types.js";
import { parseRssItems } from "./rss.js";

export const DEFAULT_SOURCE_FETCH_TIMEOUT_MS = 10_000;

export interface FetchSourcesResult {
  items: SourceItem[];
  health: Array<{ source: string; ok: boolean; itemCount: number; error?: string }>;
}

export async function fetchFixedSources(params: {
  sources: SourceConfig[];
  now: Date;
  fetchImpl?: typeof fetch;
}): Promise<FetchSourcesResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const fetchedAt = params.now.toISOString();
  const items: SourceItem[] = [];
  const health: FetchSourcesResult["health"] = [];

  for (const source of params.sources) {
    if (!source.enabled) {
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_SOURCE_FETCH_TIMEOUT_MS);
      let response: Response;

      try {
        response = await fetchImpl(source.url, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error(`Source ${source.id} timed out after ${DEFAULT_SOURCE_FETCH_TIMEOUT_MS}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        health.push({ source: source.id, ok: false, itemCount: 0, error: `HTTP ${response.status}` });
        continue;
      }

      const xml = await response.text();
      const parsedItems = parseRssItems({ xml, source, fetchedAt });
      items.push(...parsedItems);
      health.push({ source: source.id, ok: true, itemCount: parsedItems.length });
    } catch (error) {
      health.push({
        source: source.id,
        ok: false,
        itemCount: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { items, health };
}
