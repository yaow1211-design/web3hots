import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";

describe("loadConfig", () => {
  it("loads default, mia, and env configuration", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-config-"));
    await mkdir(join(root, "config"));
    await writeFile(join(root, ".env"), [
      "FEISHU_APP_ID=cli_test",
      "FEISHU_APP_SECRET=secret_test",
      ""
    ].join("\n"));
    await writeFile(join(root, "config", "default.json"), JSON.stringify({
      timezone: "Asia/Shanghai",
      defaultWindowHours: 24,
      outputDir: "runs",
      logFile: "logs/broadcast-bot.log",
      selection: { min: 1, target: 5 },
      sources: [{ id: "cointelegraph", type: "rss", url: "https://cointelegraph.com/rss", enabled: true, credibility: 0.82 }],
      marketApis: [{ id: "coingecko", enabled: true, timeoutMs: 5000 }],
      themeWeights: { regulation: 1.2, infrastructure: 1.1, security: 1.2, marketStructure: 1, aiCrypto: 1.1 }
    }));
    await writeFile(join(root, "config", "mia.json"), JSON.stringify({
      materialDocToken: "material_doc",
      xiaohongshuDocToken: "xhs_doc",
      xDocToken: "x_doc",
      feishuOpenId: "ou_test",
      priorityThemes: ["regulation", "infrastructure", "security", "marketStructure", "aiCrypto"],
      styleConstraints: ["signal over noise"],
      riskReminders: ["do not imply investment advice"]
    }));

    const config = await loadConfig({ rootDir: root });

    expect(config.env.FEISHU_APP_ID).toBe("cli_test");
    expect(config.defaultConfig.timezone).toBe("Asia/Shanghai");
    expect(config.mia.materialDocToken).toBe("material_doc");
    expect(config.defaultConfig.sources[0].id).toBe("cointelegraph");
  });

  it("rejects invalid selection bounds", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-config-invalid-"));
    await mkdir(join(root, "config"));
    await writeFile(join(root, ".env"), "FEISHU_APP_ID=cli_test\nFEISHU_APP_SECRET=secret_test\n");
    await writeFile(join(root, "config", "default.json"), JSON.stringify({
      timezone: "Asia/Shanghai",
      defaultWindowHours: 24,
      outputDir: "runs",
      logFile: "logs/broadcast-bot.log",
      selection: { min: 6, target: 3 },
      sources: [],
      marketApis: [],
      themeWeights: { regulation: 1, infrastructure: 1, security: 1, marketStructure: 1, aiCrypto: 1 }
    }));
    await writeFile(join(root, "config", "mia.json"), JSON.stringify({
      materialDocToken: "material_doc",
      xiaohongshuDocToken: "xhs_doc",
      xDocToken: "x_doc",
      feishuOpenId: "ou_test",
      priorityThemes: [],
      styleConstraints: [],
      riskReminders: []
    }));

    await expect(loadConfig({ rootDir: root })).rejects.toThrow("selection.min must be <= selection.target");
  });
});
