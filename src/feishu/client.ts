import * as lark from "@larksuiteoapi/node-sdk";
import type { FeishuDmResult, FeishuWriteResult } from "../domain/types.js";
import { markdownToPlainBlocks } from "./markdownToFeishu.js";

type FeishuSdkClient = {
  docx: {
    documentBlockChildren: {
      create(args: unknown): Promise<{ code: number; msg?: string; data?: { children?: unknown[] } }>;
    };
  };
  im: {
    message: {
      create(args: unknown): Promise<{ code: number; msg?: string; data?: { message_id?: string } }>;
    };
  };
};

const FEISHU_BLOCK_CREATE_BATCH_SIZE = 50;

export interface FeishuClient {
  appendMarkdown(docToken: string, markdown: string): Promise<FeishuWriteResult>;
  sendText(openId: string, text: string): Promise<FeishuDmResult>;
}

function failureMessage(response: { code: number; msg?: string }, fallback: string): string {
  return `${response.msg ?? fallback} (code: ${response.code})`;
}

function chunkBlocks<T>(blocks: T[]): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < blocks.length; index += FEISHU_BLOCK_CREATE_BATCH_SIZE) {
    chunks.push(blocks.slice(index, index + FEISHU_BLOCK_CREATE_BATCH_SIZE));
  }
  return chunks;
}

export function createFeishuClient(params: { appId: string; appSecret: string; client?: unknown }): FeishuClient {
  const client = (params.client ??
    new lark.Client({
      appId: params.appId,
      appSecret: params.appSecret,
      disableTokenCache: false
    })) as FeishuSdkClient;

  return {
    async appendMarkdown(docToken: string, markdown: string): Promise<FeishuWriteResult> {
      try {
        const blocks = markdownToPlainBlocks(markdown);

        for (const blockChunk of chunkBlocks(blocks)) {
          const response = await client.docx.documentBlockChildren.create({
            path: { document_id: docToken, block_id: docToken },
            data: { children: blockChunk }
          });

          if (response.code !== 0) {
            return { ok: false, docToken, error: failureMessage(response, "Feishu doc write failed") };
          }
        }

        return {
          ok: true,
          docToken,
          url: `https://applink.feishu.cn/docx/${docToken}`
        };
      } catch (error) {
        return {
          ok: false,
          docToken,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },

    async sendText(openId: string, text: string): Promise<FeishuDmResult> {
      try {
        const response = await client.im.message.create({
          params: { receive_id_type: "open_id" },
          data: {
            receive_id: openId,
            msg_type: "text",
            content: JSON.stringify({ text })
          }
        });

        if (response.code !== 0) {
          return { ok: false, error: failureMessage(response, "Feishu DM failed") };
        }

        return { ok: true, messageId: response.data?.message_id };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}
