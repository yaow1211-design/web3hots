import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourceConfig } from "../src/domain/types.js";
import { DEFAULT_SOURCE_FETCH_TIMEOUT_MS, fetchFixedSources } from "../src/sources/fixedSources.js";
import { parseRssItems } from "../src/sources/rss.js";

const source: SourceConfig = {
  id: "cointelegraph",
  type: "rss",
  url: "https://cointelegraph.com/rss",
  enabled: true,
  credibility: 0.82
};

describe("parseRssItems", () => {
  it("parses RSS items into SourceItem records", async () => {
    const xml = await readFile(join(process.cwd(), "tests", "fixtures", "cointelegraph-rss.xml"), "utf8");
    const items = parseRssItems({ xml, source, fetchedAt: "2026-06-28T02:00:00.000Z" });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: "cointelegraph:eth-client-diversity",
      source: "cointelegraph",
      sourceType: "rss",
      title: "Ethereum validators adopt new client diversity policy",
      url: "https://cointelegraph.com/news/ethereum-client-diversity-policy",
      publishedAt: "2026-06-28T00:30:00.000Z",
      summary: "Validator operators are shifting client choices after a foundation update."
    });
  });
});

describe("fetchFixedSources", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records source health for successful and failed sources", async () => {
    const xml = await readFile(join(process.cwd(), "tests", "fixtures", "cointelegraph-rss.xml"), "utf8");
    const fetchImpl = async (url: string | URL | Request) => {
      if (String(url).includes("cointelegraph")) {
        return new Response(xml, { status: 200 });
      }
      return new Response("blocked", { status: 403 });
    };

    const result = await fetchFixedSources({
      sources: [
        source,
        { ...source, id: "blocked", url: "https://blocked.example/rss" }
      ],
      now: new Date("2026-06-28T02:00:00.000Z"),
      fetchImpl
    });

    expect(result.items).toHaveLength(2);
    expect(result.health).toEqual([
      { source: "cointelegraph", ok: true, itemCount: 2 },
      { source: "blocked", ok: false, itemCount: 0, error: "HTTP 403" }
    ]);
  });

  it("aborts stalled sources on timeout, records the failure, and continues to later sources", async () => {
    vi.useFakeTimers();
    const xml = await readFile(join(process.cwd(), "tests", "fixtures", "cointelegraph-rss.xml"), "utf8");
    const signalStates: Array<{ source: string; hasSignal: boolean }> = [];
    const fetchImpl = (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("stalled")) {
        signalStates.push({ source: "stalled", hasSignal: Boolean(init?.signal) });
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("stalled fetch aborted"));
          }, { once: true });
        });
      }

      signalStates.push({ source: "cointelegraph", hasSignal: Boolean(init?.signal) });
      return Promise.resolve(new Response(xml, { status: 200 }));
    };

    const resultPromise = fetchFixedSources({
      sources: [
        { ...source, id: "stalled", url: "https://stalled.example/rss" },
        source
      ],
      now: new Date("2026-06-28T02:00:00.000Z"),
      fetchImpl
    });

    await vi.advanceTimersByTimeAsync(DEFAULT_SOURCE_FETCH_TIMEOUT_MS);
    const result = await resultPromise;

    expect(signalStates).toEqual([
      { source: "stalled", hasSignal: true },
      { source: "cointelegraph", hasSignal: true }
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.health).toEqual([
      { source: "stalled", ok: false, itemCount: 0, error: `Source stalled timed out after ${DEFAULT_SOURCE_FETCH_TIMEOUT_MS}ms` },
      { source: "cointelegraph", ok: true, itemCount: 2 }
    ]);
  });
});
