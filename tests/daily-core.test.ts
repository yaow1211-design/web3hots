import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runDailyCore } from "../src/runner/dailyCore.js";
import { storageConfig } from "./fixtures/default-config.js";
import { sourceItems } from "./fixtures/source-items.js";

describe("runDailyCore", () => {
  it("saves local artifacts, skips Feishu, and records a clear failure when selected events stay below selection.min", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-core-min-"));
    await mkdir(join(root, "config"));
    await writeFile(join(root, ".env"), "FEISHU_APP_ID=cli_test\nFEISHU_APP_SECRET=secret_test\n");
    await writeFile(
      join(root, "config", "default.json"),
      JSON.stringify({
        timezone: "Asia/Shanghai",
        defaultWindowHours: 24,
        outputDir: "custom-runs",
        logFile: "logs/broadcast-bot.log",
        selection: { min: 2, target: 3 },
        sources: [{ id: "cointelegraph", type: "rss", url: "https://cointelegraph.com/rss", enabled: true, credibility: 0.82 }],
        marketApis: [{ id: "coingecko", enabled: true, timeoutMs: 5000 }],
        storage: storageConfig(),
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

    let appendMarkdownCalls = 0;
    let sendTextCalls = 0;

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
          appendMarkdownCalls += 1;
          return { ok: true, docToken: "material_doc", url: "https://my.feishu.cn/docx/material_doc" };
        },
        sendText: async () => {
          sendTextCalls += 1;
          return { ok: true, messageId: "msg_123" };
        }
      }
    });

    expect(pack.selectedEvents).toHaveLength(1);
    expect(appendMarkdownCalls).toBe(0);
    expect(sendTextCalls).toBe(0);
    expect(pack.feishuWriteResult).toMatchObject({
      ok: false,
      docToken: "material_doc",
      error: "Feishu delivery skipped: selected events 1 below selection.min 2."
    });
    expect(pack.dmResult).toMatchObject({
      ok: false,
      error: "Feishu delivery skipped: selected events 1 below selection.min 2."
    });
    expect(await readFile(join(root, "custom-runs", "2026-06-28", "core.md"), "utf8")).toContain(
      "Feishu delivery skipped: selected events 1 below selection.min 2."
    );
    const savedJson = JSON.parse(await readFile(join(root, "custom-runs", "2026-06-28", "core.json"), "utf8"));
    expect(savedJson.feishuWriteResult).toMatchObject({
      ok: false,
      docToken: "material_doc",
      error: "Feishu delivery skipped: selected events 1 below selection.min 2."
    });
    expect(savedJson.dmResult).toMatchObject({
      ok: false,
      error: "Feishu delivery skipped: selected events 1 below selection.min 2."
    });
    expect(await readFile(join(root, "logs", "broadcast-bot.log"), "utf8")).toContain(
      "daily-core finished status=failed reason=\"selected events 1 below selection.min 2\""
    );
  });

  it("saves local outputs before Feishu delivery and does not send daily-core DMs", async () => {
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
        storage: storageConfig(),
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
    let appendedMarkdown = "";
    let sendTextCalls = 0;

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
        appendMarkdown: async (_docToken, markdown) => {
          appendedMarkdown = markdown;
          deliveryChecks.push({
            step: "appendMarkdown",
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.json"))
          });
          return { ok: true, docToken: "material_doc", url: "https://my.feishu.cn/docx/material_doc" };
        },
        sendText: async (_openId, text) => {
          sendTextCalls += 1;
          deliveryChecks.push({
            step: "sendText",
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "core.json"))
          });
          return { ok: false, error: `unexpected DM: ${text}` };
        }
      }
    });

    expect(pack.selectedEvents).toHaveLength(1);
    expect(pack.feishuWriteResult?.ok).toBe(true);
    expect(pack.dmResult).toBeUndefined();
    expect(pack.openClawPromptDmResult).toBeUndefined();
    expect(pack.status).toBe("ok");
    expect(sendTextCalls).toBe(0);
    expect(deliveryChecks).toEqual([
      { step: "appendMarkdown", markdownExists: true, jsonExists: true }
    ]);
    expect(appendedMarkdown).not.toContain("Generation prompt");
    expect(appendedMarkdown).not.toContain("Create a concise Web3 brief");
    expect(await readFile(join(root, "custom-runs", "2026-06-28", "core.md"), "utf8")).toContain(
      "# 6月28日 Web3 素材库 | Core Material Pack"
    );
    const savedJson = JSON.parse(await readFile(join(root, "custom-runs", "2026-06-28", "core.json"), "utf8"));
    expect(savedJson.runId).toContain("core-2026-06-28");
    expect(savedJson.feishuWriteResult).toMatchObject({ ok: true, docToken: "material_doc" });
    expect(savedJson.dmResult).toBeUndefined();
  });

  it("records degraded status when the material document write fails without sending a DM", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-core-doc-failed-"));
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
        storage: storageConfig(),
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

    let sendTextCalls = 0;

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
        appendMarkdown: async () => ({ ok: false, docToken: "material_doc", error: "doc failed" }),
        sendText: async (_openId, text) => {
          sendTextCalls += 1;
          return { ok: true, messageId: "msg_123" };
        }
      }
    });

    expect(pack.feishuWriteResult).toMatchObject({ ok: false, docToken: "material_doc", error: "doc failed" });
    expect(pack.status).toBe("degraded");
    expect(pack.dmResult).toBeUndefined();
    expect(pack.openClawPromptDmResult).toBeUndefined();
    expect(sendTextCalls).toBe(0);
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
