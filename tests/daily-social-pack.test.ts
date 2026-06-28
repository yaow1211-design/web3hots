import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runDailySocialPack } from "../src/runner/dailySocialPack.js";
import { writeJsonFile } from "../src/state/runStore.js";
import { storageConfig } from "./fixtures/default-config.js";

const configDefault = {
  timezone: "Asia/Shanghai",
  defaultWindowHours: 24,
  outputDir: "custom-runs",
  logFile: "logs/broadcast-bot.log",
  selection: { min: 1, target: 3 },
  sources: [],
  marketApis: [],
  storage: storageConfig(),
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

  it("fails clearly when the saved core pack failed readiness and never calls Feishu", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-social-core-failed-"));
    await writeConfig(root);
    const coreJson = join(root, "custom-runs", "2026-06-28", "core.json");

    await writeJsonFile(coreJson, {
      runId: "core-2026-06-28",
      date: "2026-06-28",
      status: "failed",
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
      jsonPath: coreJson,
      feishuWriteResult: {
        ok: false,
        docToken: "material_doc",
        error: "Feishu delivery skipped: selected events 1 below selection.min 2."
      },
      dmResult: {
        ok: false,
        error: "Feishu delivery skipped: selected events 1 below selection.min 2."
      }
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
    })).rejects.toThrow(
      "Core package for 2026-06-28 is not ready for social delivery: Feishu delivery skipped: selected events 1 below selection.min 2."
    );

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
    const appendedMarkdown: Array<{ docToken: string; markdown: string }> = [];

    const pack = await runDailySocialPack({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      feishuClient: {
        appendMarkdown: async (docToken, markdown) => {
          appendedMarkdown.push({ docToken, markdown });
          deliveryChecks.push({
            step: `append:${docToken}`,
            markdownExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.md")),
            jsonExists: await fileExists(join(root, "custom-runs", "2026-06-28", "social-pack.json"))
          });
          return { ok: true, docToken, url: `https://my.feishu.cn/docx/${docToken}` };
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
    expect(appendedMarkdown[0]).toMatchObject({ docToken: "xhs_doc" });
    expect(appendedMarkdown[0].markdown).toContain("# 6月28日 小红书草稿 | Web3 早报角度");
    expect(appendedMarkdown[0].markdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(appendedMarkdown[0].markdown.indexOf("## English")).toBeLessThan(appendedMarkdown[0].markdown.indexOf("## 中文"));
    expect(appendedMarkdown[1]).toMatchObject({ docToken: "x_doc" });
    expect(appendedMarkdown[1].markdown).toContain("# 6月28日 X 草稿 | Web3 早报角度");
    expect(appendedMarkdown[1].markdown).toContain("Date: June 28, 2026\n日期：2026年6月28日");
    expect(appendedMarkdown[1].markdown.indexOf("## English X prompt")).toBeLessThan(appendedMarkdown[1].markdown.indexOf("## 中文 X prompt"));
    expect(await readFile(join(root, "custom-runs", "2026-06-28", "social-pack.md"), "utf8")).toContain(
      "# 6月28日 Social Package | Web3 早报角度"
    );

    const savedJson = JSON.parse(await readFile(join(root, "custom-runs", "2026-06-28", "social-pack.json"), "utf8"));
    expect(savedJson.runId).toContain("social-2026-06-28");
    expect(savedJson.feishuWriteResults).toEqual([
      { ok: true, docToken: "xhs_doc", url: "https://my.feishu.cn/docx/xhs_doc" },
      { ok: true, docToken: "x_doc", url: "https://my.feishu.cn/docx/x_doc" }
    ]);
    expect(savedJson.dmResult).toMatchObject({ ok: false, error: "DM unavailable" });
  });

  it("sends a degraded DM when social document writes fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-social-doc-failed-"));
    await writeConfig(root);
    const coreJson = join(root, "custom-runs", "2026-06-28", "core.json");

    await writeJsonFile(coreJson, {
      runId: "core-2026-06-28",
      date: "2026-06-28",
      status: "ok",
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

    let dmText = "";

    const pack = await runDailySocialPack({
      rootDir: root,
      now: new Date("2026-06-27T16:30:00.000Z"),
      feishuClient: {
        appendMarkdown: async (docToken) => ({ ok: false, docToken, error: "doc failed" }),
        sendText: async (_openId, text) => {
          dmText = text;
          return { ok: true, messageId: "msg_123" };
        }
      }
    });

    expect(pack.feishuWriteResults).toEqual([
      { ok: false, docToken: "xhs_doc", error: "doc failed" },
      { ok: false, docToken: "x_doc", error: "doc failed" }
    ]);
    expect(dmText).toContain("degraded");
    expect(dmText).toContain("doc failed");
    expect(dmText).not.toContain("package ready");
    expect(dmText).not.toContain("Xiaohongshu doc: xhs_doc");
    expect(dmText).not.toContain("X doc: x_doc");
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
