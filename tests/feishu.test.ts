import { describe, expect, it } from "vitest";
import { createFeishuClient } from "../src/feishu/client.js";
import { markdownToPlainBlocks } from "../src/feishu/markdownToFeishu.js";

describe("markdownToPlainBlocks", () => {
  it("converts markdown lines into safe text blocks", () => {
    const blocks = markdownToPlainBlocks("# Title\n\n- Item");

    expect(blocks).toEqual([
      { block_type: 2, text: { elements: [{ text_run: { content: "# Title" } }] } },
      { block_type: 2, text: { elements: [{ text_run: { content: "- Item" } }] } }
    ]);
  });
});

describe("createFeishuClient", () => {
  it("appends markdown using documentBlockChildren.create and returns doc URL", async () => {
    const calls: string[] = [];
    const sdkClient = {
      docx: {
        documentBlockChildren: {
          create: async (args: unknown) => {
            calls.push(JSON.stringify(args));
            return { code: 0, data: { children: [{ block_id: "block1" }] } };
          }
        }
      },
      im: {
        message: {
          create: async () => ({ code: 0, data: { message_id: "msg1" } })
        }
      }
    };

    const client = createFeishuClient({ appId: "cli", appSecret: "secret", client: sdkClient });
    const result = await client.appendMarkdown("doc_token", "# Title");

    expect(result).toEqual({
      ok: true,
      docToken: "doc_token",
      url: "https://my.feishu.cn/docx/doc_token"
    });
    expect(calls[0]).toContain("children");
  });

  it("appends multiline markdown in a single documentBlockChildren.create request", async () => {
    const calls: unknown[] = [];
    const sdkClient = {
      docx: {
        documentBlockChildren: {
          create: async (args: unknown) => {
            calls.push(args);
            return { code: 0, data: { children: [{ block_id: "block1" }] } };
          }
        }
      },
      im: {
        message: {
          create: async () => ({ code: 0, data: { message_id: "msg1" } })
        }
      }
    };

    const client = createFeishuClient({ appId: "cli", appSecret: "secret", client: sdkClient });

    await client.appendMarkdown("doc_token", "# Title\n\n- Item");

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      path: { document_id: "doc_token", block_id: "doc_token" },
      data: {
        children: [
          { block_type: 2, text: { elements: [{ text_run: { content: "# Title" } }] } },
          { block_type: 2, text: { elements: [{ text_run: { content: "- Item" } }] } }
        ]
      }
    });
  });

  it("chunks large markdown appends to stay within Feishu block creation limits", async () => {
    const calls: unknown[] = [];
    const sdkClient = {
      docx: {
        documentBlockChildren: {
          create: async (args: unknown) => {
            calls.push(args);
            return { code: 0, data: { children: [{ block_id: `block${calls.length}` }] } };
          }
        }
      },
      im: {
        message: {
          create: async () => ({ code: 0, data: { message_id: "msg1" } })
        }
      }
    };
    const markdown = Array.from({ length: 101 }, (_, index) => `Line ${index + 1}`).join("\n");

    const client = createFeishuClient({ appId: "cli", appSecret: "secret", client: sdkClient });
    const result = await client.appendMarkdown("doc_token", markdown);

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => (call as { data: { children: unknown[] } }).data.children.length)).toEqual([50, 50, 1]);
  });

  it("returns structured errors for document and DM failures", async () => {
    const sdkClient = {
      docx: {
        documentBlockChildren: {
          create: async () => ({ code: 1770029, msg: "field validation failed" })
        }
      },
      im: {
        message: {
          create: async () => ({ code: 999, msg: "send failed" })
        }
      }
    };

    const client = createFeishuClient({ appId: "cli", appSecret: "secret", client: sdkClient });

    await expect(client.appendMarkdown("doc_token", "# Title")).resolves.toMatchObject({
      ok: false,
      docToken: "doc_token",
      error: "field validation failed (code: 1770029)"
    });
    await expect(client.sendText("ou_test", "hello")).resolves.toMatchObject({
      ok: false,
      error: "send failed (code: 999)"
    });
  });
});
