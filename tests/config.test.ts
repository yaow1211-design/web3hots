import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";
import { storageConfig } from "./fixtures/default-config.js";

describe("loadConfig", () => {
  it("loads the checked-in default config with local storage reserved for Supabase", async () => {
    const config = await loadConfig({
      rootDir: process.cwd(),
      envPath: join(process.cwd(), ".env.example"),
      miaConfigPath: join(process.cwd(), "config", "mia.example.json")
    });

    expect(config.defaultConfig.storage.provider).toBe("local");
    expect(config.defaultConfig.storage.freePlan).toBe("supabase");
    expect(config.defaultConfig.storage.supabase.enabled).toBe(false);
    expect(config.defaultConfig.storage.supabase.projectUrlEnv).toBe("SUPABASE_URL");
    expect(config.defaultConfig.storage.supabase.serviceRoleKeyEnv).toBe("SUPABASE_SERVICE_ROLE_KEY");
    expect(config.defaultConfig.storage.supabase.bucket).toBe("broadcast-bot-runs");
    expect(config.defaultConfig.storage.supabase.tables).toEqual({
      coreRuns: "broadcast_core_runs",
      socialRuns: "broadcast_social_runs"
    });
  });

  it("keeps Supabase env placeholders optional in the example dotenv file", async () => {
    const exampleEnv = await readFile(join(process.cwd(), ".env.example"), "utf8");

    expect(exampleEnv).toContain("SUPABASE_URL=\n");
    expect(exampleEnv).toContain("SUPABASE_SERVICE_ROLE_KEY=\n");

    await expect(loadConfig({
      rootDir: process.cwd(),
      envPath: join(process.cwd(), ".env.example"),
      miaConfigPath: join(process.cwd(), "config", "mia.example.json")
    })).resolves.toMatchObject({
      env: {
        FEISHU_APP_ID: "cli_xxx",
        FEISHU_APP_SECRET: "replace_with_secret"
      }
    });
  });

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
      storage: storageConfig(),
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
    expect(config.defaultConfig.storage).toEqual(storageConfig());
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
      storage: storageConfig(),
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

  it("rejects enabling Supabase storage before cloud persistence exists", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-config-invalid-storage-"));
    await mkdir(join(root, "config"));
    await writeFile(join(root, ".env"), "FEISHU_APP_ID=cli_test\nFEISHU_APP_SECRET=secret_test\n");
    await writeFile(join(root, "config", "default.json"), JSON.stringify({
      timezone: "Asia/Shanghai",
      defaultWindowHours: 24,
      outputDir: "runs",
      logFile: "logs/broadcast-bot.log",
      selection: { min: 1, target: 3 },
      sources: [],
      marketApis: [],
      storage: storageConfig(true),
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

    await expect(loadConfig({ rootDir: root })).rejects.toThrow("storage.supabase.enabled must stay false until cloud persistence is implemented");
  });
});
