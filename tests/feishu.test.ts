import { describe, expect, it } from "vitest";
import { createFeishuClient } from "../src/feishu/client.js";
import { markdownToPlainBlocks } from "../src/feishu/markdownToFeishu.js";

describe("markdownToPlainBlocks", () => {
  it("converts markdown headings and text into Feishu blocks", () => {
    const blocks = markdownToPlainBlocks("# 6月28日 小红书草稿 | Web3 早报角度\n\n## English\n\n- Item");

    expect(blocks).toEqual([
      { block_type: 3, heading1: { elements: [{ text_run: { content: "6月28日 小红书草稿 | Web3 早报角度" } }] } },
      { block_type: 4, heading2: { elements: [{ text_run: { content: "English" } }] } },
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
    expect(calls[0]).toContain("\"index\":0");
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
        index: 0,
        children: [
          { block_type: 3, heading1: { elements: [{ text_run: { content: "Title" } }] } },
          { block_type: 2, text: { elements: [{ text_run: { content: "- Item" } }] } }
        ]
      }
    });
  });

  it("chunks large markdown appends to stay within Feishu block creation limits", async () => {
    const calls: unknown[] = [];
    let documentChildren: Array<{
      text?: { elements: Array<{ text_run: { content: string } }> };
    }> = [];
    const sdkClient = {
      docx: {
        documentBlockChildren: {
          create: async (args: {
            data: {
              index?: number;
              children: Array<{
                text?: { elements: Array<{ text_run: { content: string } }> };
              }>;
            };
          }) => {
            calls.push(args);
            if (args.data.index === 0) {
              documentChildren = [...args.data.children, ...documentChildren];
            } else {
              documentChildren = [...documentChildren, ...args.data.children];
            }
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
    expect(calls.map((call) => (call as { data: { index?: number } }).data.index)).toEqual([0, 0, 0]);
    expect(calls.map((call) => (call as { data: { children: unknown[] } }).data.children.length)).toEqual([1, 50, 50]);
    expect(documentChildren.map((block) => block.text?.elements[0].text_run.content)).toEqual(
      Array.from({ length: 101 }, (_, index) => `Line ${index + 1}`)
    );
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
