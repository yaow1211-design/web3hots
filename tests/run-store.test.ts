import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendLog } from "../src/state/logger.js";
import { getRunPaths } from "../src/state/paths.js";
import { readCorePack, writeJsonFile, writeTextFile } from "../src/state/runStore.js";

describe("run store", () => {
  it("writes run JSON, markdown, and logs under date directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-store-"));
    const paths = getRunPaths(root, "2026-06-28");

    await writeJsonFile(paths.coreJson, { runId: "core-1", selectedEvents: [] });
    await writeTextFile(paths.coreMarkdown, "# Core");
    await appendLog(join(root, "logs", "broadcast-bot.log"), "core complete");

    expect(JSON.parse(await readFile(paths.coreJson, "utf8")).runId).toBe("core-1");
    expect(await readFile(paths.coreMarkdown, "utf8")).toBe("# Core");
    expect(await readFile(join(root, "logs", "broadcast-bot.log"), "utf8")).toContain("core complete");
  });

  it("derives run paths under a custom output directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-store-custom-"));
    const paths = getRunPaths(root, "2026-06-28", "custom-runs");

    expect(paths.runDir).toBe(join(root, "custom-runs", "2026-06-28"));
    expect(paths.coreJson).toBe(join(root, "custom-runs", "2026-06-28", "core.json"));
    expect(paths.coreMarkdown).toBe(join(root, "custom-runs", "2026-06-28", "core.md"));
    expect(paths.socialJson).toBe(join(root, "custom-runs", "2026-06-28", "social-pack.json"));
    expect(paths.socialMarkdown).toBe(join(root, "custom-runs", "2026-06-28", "social-pack.md"));
  });

  it("reads a saved core pack", async () => {
    const root = await mkdtemp(join(tmpdir(), "broadcast-core-read-"));
    const paths = getRunPaths(root, "2026-06-28");
    await writeJsonFile(paths.coreJson, {
      runId: "core-1",
      date: "2026-06-28",
      window: "24h",
      sourceHealth: [],
      selectedEvents: [],
      marketSnapshot: {
        trendSummary: "degraded",
        sources: [],
        degraded: true,
        fetchedAt: "2026-06-28T02:00:00.000Z"
      },
      generationPrompt: "prompt",
      markdownPath: paths.coreMarkdown,
      jsonPath: paths.coreJson
    });

    const core = await readCorePack(paths.coreJson);

    expect(core.runId).toBe("core-1");
  });
});
