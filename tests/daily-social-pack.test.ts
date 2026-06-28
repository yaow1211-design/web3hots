import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runDailySocialPack } from "../src/runner/dailySocialPack.js";
import { writeJsonFile } from "../src/state/runStore.js";

const configDefault = {
  timezone: "Asia/Shanghai",
  defaultWindowHours: 24,
  outputDir: "custom-runs",
  logFile: "logs/broadcast-bot.log",
  selection: { min: 1, target: 3 },
  sources: [],
  marketApis: [],
  themeWeights: { regulation: 1.2, infrastructure: 1.1, security: 1.2, marketStructure: 1, aiCrypto: 1.1 }
};

const configMia = {
  materialDocToken: "material_doc",
  xiaohongshuDocToken: "xhs_doc",
  xDocToken: "x_doc",
  feishuOpenId: "ou_test",
  priorityThemes: ["regulation"],
  styleConstraints: ["signal over noise"],
  riskReminders: ["do not imply investment advice"]
};

async function writeConfig(root: string): Promise<void> {
  await mkdir(join(root, "config"));
  await writeFile(join(root, ".env"), "FEISHU_APP_ID=cli_test\nFEISHU_APP_SECRET=secret_test\n");
  await writeFile(join(root, "config", "default.json"), JSON.stringify(configDefault));
  await writeFile(join(root, "config", "mia.json"), JSON.stringify(configMia));
}

describe("runDailySocialPack", () => {
  it("fails clearly when the core pack is missing for the configured timezone date", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-social-missing-"));
    await writeConfig(root);

    await expect(runDailySocialPack({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      feishuClient: {
        appendMarkdown: async () => ({ ok: true, docToken: "x" }),
        sendText: async () => ({ ok: true })
      }
    })).rejects.toThrow("Missing core package for 2026-06-28. Run daily-core first.");
  });

  it("fails clearly when the saved core pack has no selected events and never calls Feishu", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-social-empty-"));
    await writeConfig(root);
    const coreJson = join(root, "custom-runs", "2026-06-28", "core.json");

    await writeJsonFile(coreJson, {
      runId: "core-2026-06-28",
      date: "2026-06-28",
      window: "24h",
      sourceHealth: [],
      selectedEvents: [],
      marketSnapshot: { trendSummary: "degraded", sources: [], degraded: true, fetchedAt: "2026-06-28T02:00:00.000Z" },
      generationPrompt: "prompt",
      markdownPath: join(root, "custom-runs", "2026-06-28", "core.md"),
      jsonPath: coreJson
    });

    let appendMarkdownCalls = 0;
    let sendTextCalls = 0;

    await expect(runDailySocialPack({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      feishuClient: {
        appendMarkdown: async () => {
          appendMarkdownCalls += 1;
          return { ok: true, docToken: "x" };
        },
        sendText: async () => {
          sendTextCalls += 1;
          return { ok: true };
        }
      }
    })).rejects.toThrow("Core package for 2026-06-28 has no selected events. Re-run daily-core after enough events are selected.");

    expect(appendMarkdownCalls).toBe(0);
    expect(sendTextCalls).toBe(0);
  });

  it("builds from saved core pack, saves local outputs before Feishu delivery, and rewrites JSON with delivery results", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-social-"));
    await writeConfig(root);
    const coreJson = join(root, "custom-runs", "2026-06-28", "core.json");

    await writeJsonFile(coreJson, {
      runId: "core-2026-06-28",
      date: "2026-06-28",
      window: "24h",
      sourceHealth: [],
      selectedEvents: [{
        id: "event1",
        title: "SEC issues new stablecoin custody guidance",
        canonicalUrl: "https://example.com/sec",
        sources: [{ source: "cointelegraph", url: "https://example.com/sec", publishedAt: "2026-06-28T00:30:00.000Z" }],
        publishedAt: "2026-06-28T00:30:00.000Z",
        summary: "The guidance changes reserve disclosure expectations.",
        theme: "regulation",
        isDuplicate: false,
        initialReason: "within window",
        credibilityScore: 0.82,
        timelinessScore: 1,
        impactScore: 0.9,
        miaAngleScore: 0.8,
        contentPotentialScore: 0.85,
        totalScore: 5.244,
        selectionReason: "selected for structural impact"
      }],
      marketSnapshot: { trendSummary: "degraded", sources: [], degraded: true, fetchedAt: "2026-06-28T02:00:00.000Z" },
      generationPrompt: "prompt",
      markdownPath: join(root, "custom-runs", "2026-06-28", "core.md"),
      jsonPath: coreJson
    });

    const deliveryChecks: Array<{ step: string; markdownExists: boolean; jsonExists: boolean }> = [];

    const pack = await runDailySocialPack({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      feishuClient: {
        appendMarkdown: async (docToken) => {
          deliveryChecks.push({
            step: `append:${docToken}`,
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.json"))
          });
          return { ok: true, docToken, url: `https://applink.feishu.cn/docx/${docToken}` };
        },
        sendText: async () => {
          deliveryChecks.push({
            step: "sendText",
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.json"))
          });
          return { ok: false, error: "DM unavailable" };
        }
      }
    });

    expect(pack.selectedTopics).toHaveLength(1);
    expect(pack.feishuWriteResults?.map((item) => item.docToken)).toEqual(["xhs_doc", "x_doc"]);
    expect(pack.dmResult).toMatchObject({ ok: false, error: "DM unavailable" });
    expect(deliveryChecks).toEqual([
      { step: "append:xhs_doc", markdownExists: true, jsonExists: true },
      { step: "append:x_doc", markdownExists: true, jsonExists: true },
      { step: "sendText", markdownExists: true, jsonExists: true }
    ]);
    expect(await readFile(join(root, "custom-runs", "2026-06-28", "social-pack.md"), "utf8")).toContain("# Social Package | 2026-06-28");

    const savedJson = JSON.parse(await readFile(join(root, "custom-runs", "2026-06-28", "social-pack.json"), "utf8"));
    expect(savedJson.runId).toContain("social-2026-06-28");
    expect(savedJson.feishuWriteResults).toEqual([
      { ok: true, docToken: "xhs_doc", url: "https://applink.feishu.cn/docx/xhs_doc" },
      { ok: true, docToken: "x_doc", url: "https://applink.feishu.cn/docx/x_doc" }
    ]);
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
