import { XMLParser } from "fast-xml-parser";
import type { SourceConfig, SourceItem } from "../domain/types.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  cdataPropName: "__cdata"
});

function readText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const direct = record["#text"];
  if (typeof direct === "string") {
    return direct.trim();
  }

  const cdata = record.__cdata;
  if (typeof cdata === "string") {
    return cdata.trim();
  }

  return "";
}

function readLink(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const href = record["@_href"];
  if (typeof href === "string") {
    return href.trim();
  }

  return readText(value);
}

function readItems(parsed: unknown): unknown[] {
  const root = parsed as {
    rss?: { channel?: { item?: unknown } };
    feed?: { entry?: unknown };
  };

  const items = root.rss?.channel?.item ?? root.feed?.entry ?? [];
  return Array.isArray(items) ? items : [items];
}

function toIsoDate(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseRssItems(params: { xml: string; source: SourceConfig; fetchedAt: string }): SourceItem[] {
  const parsed = parser.parse(params.xml);

  return readItems(parsed)
    .map((raw, index) => {
      const item = raw as Record<string, unknown>;
      const title = readText(item.title);
      const url = readLink(item.link);
      const guid = readText(item.guid) || url || String(index);
      const publishedAt = toIsoDate(readText(item.pubDate) || readText(item.published) || readText(item.updated));
      const summary = readText(item.description) || readText(item.summary) || readText(item.content);

      if (!title || !url || !publishedAt) {
        return null;
      }

      return {
        id: `${params.source.id}:${guid}`,
        source: params.source.id,
        sourceType: params.source.type,
        title,
        url,
        publishedAt,
        summary,
        rawText: [title, summary].filter(Boolean).join("\n"),
        fetchedAt: params.fetchedAt
      } satisfies SourceItem;
    })
    .filter((item): item is SourceItem => item !== null);
}
