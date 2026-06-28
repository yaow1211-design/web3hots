import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("repo hygiene", () => {
  it("keeps the tracked Mia example config on inert placeholders and requires explicit operator replacement", async () => {
    const repoRoot = process.cwd();
    const exampleConfig = JSON.parse(
      await readFile(join(repoRoot, "config", "mia.example.json"), "utf8")
    ) as {
      materialDocToken: string;
      xiaohongshuDocToken: string;
      xDocToken: string;
      feishuOpenId: string;
    };
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");

    expect(exampleConfig.materialDocToken).toBe("fill_in_material_doc_token");
    expect(exampleConfig.xiaohongshuDocToken).toBe("fill_in_xiaohongshu_doc_token");
    expect(exampleConfig.xDocToken).toBe("fill_in_x_doc_token");
    expect(exampleConfig.feishuOpenId).toBe("fill_in_feishu_open_id");
    expect(readme).toContain("Replace every placeholder in `config/mia.json` with your real Feishu document tokens and `open_id` before running.");
    expect(readme).not.toContain("Edit `config/mia.json` only if document tokens or the Feishu open ID change.");
  });
});
