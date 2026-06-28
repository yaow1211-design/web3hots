import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runDailyCore } from "../src/runner/dailyCore.js";
import { sourceItems } from "./fixtures/source-items.js";

describe("runDailyCore", () => {
  it("saves local outputs before Feishu delivery and returns a degraded package when DM fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-core-"));
    await mkdir(join(root, "config"));
    await writeFile(join(root, ".env"), "FEISHU_APP_ID=cli_test\nFEISHU_APP_SECRET=secret_test\n");
    await writeFile(
      join(root, "config", "default.json"),
      JSON.stringify({
        timezone: "Asia/Shanghai",
        defaultWindowHours: 24,
        outputDir: "custom-runs",
        logFile: "logs/broadcast-bot.log",
        selection: { min: 1, target: 3 },
        sources: [{ id: "cointelegraph", type: "rss", url: "https://cointelegraph.com/rss", enabled: true, credibility: 0.82 }],
        marketApis: [{ id: "coingecko", enabled: true, timeoutMs: 5000 }],
        themeWeights: { regulation: 1.2, infrastructure: 1.1, security: 1.2, marketStructure: 1, aiCrypto: 1.1 }
      })
    );
    await writeFile(
      join(root, "config", "mia.json"),
      JSON.stringify({
        materialDocToken: "material_doc",
        xiaohongshuDocToken: "xhs_doc",
        xDocToken: "x_doc",
        feishuOpenId: "ou_test",
        priorityThemes: ["regulation"],
        styleConstraints: ["signal over noise"],
        riskReminders: ["do not imply investment advice"]
      })
    );

    const deliveryChecks: Array<{ step: "appendMarkdown" | "sendText"; markdownExists: boolean; jsonExists: boolean }> = [];

    const pack = await runDailyCore({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      fetchSources: async () => ({
        items: sourceItems,
        health: [{ source: "fixture", ok: true, itemCount: sourceItems.length }]
      }),
      fetchMarket: async () => ({
        trendSummary: "Market API unavailable; package keeps only verifiable news context.",
        sources: [],
        degraded: true,
        degradationReason: "fixture",
        fetchedAt: "2026-06-27T16:30:00.000Z"
      }),
      feishuClient: {
        appendMarkdown: async () => {
          deliveryChecks.push({
            step: "appendMarkdown",
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.json"))
          });
          return { ok: true, docToken: "material_doc", url: "https://applink.feishu.cn/docx/material_doc" };
        },
        sendText: async () => {
          deliveryChecks.push({
            step: "sendText",
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.json"))
          });
          return { ok: false, error: "DM unavailable" };
        }
      }
    });

    expect(pack.selectedEvents).toHaveLength(1);
    expect(pack.feishuWriteResult?.ok).toBe(true);
    expect(pack.dmResult?.ok).toBe(false);
    expect(deliveryChecks).toEqual([
      { step: "appendMarkdown", markdownExists: true, jsonExists: true },
      { step: "sendText", markdownExists: true, jsonExists: true }
    ]);
    expect(await readFile(join(root, "custom-runs", "2026-06-28", "core.md"), "utf8")).toContain("Web3 Core Material Pack");
    const savedJson = JSON.parse(await readFile(join(root, "custom-runs", "2026-06-28", "core.json"), "utf8"));
    expect(savedJson.runId).toContain("core-2026-06-28");
    expect(savedJson.feishuWriteResult).toMatchObject({ ok: true, docToken: "material_doc" });
    expect(savedJson.dmResult).toMatchObject({ ok: false, error: "DM unavailable" });
  });
});

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}
