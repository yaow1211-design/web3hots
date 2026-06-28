import { z } from "zod";

export const envSchema = z.object({
  FEISHU_APP_ID: z.string().min(1),
  FEISHU_APP_SECRET: z.string().min(1)
});

export const defaultConfigSchema = z.object({
  timezone: z.literal("Asia/Shanghai"),
  defaultWindowHours: z.number().int().positive(),
  outputDir: z.string().min(1),
  logFile: z.string().min(1),
  selection: z.object({
    min: z.number().int().positive(),
    target: z.number().int().positive()
  }),
  sources: z.array(z.object({
    id: z.string().min(1),
    type: z.literal("rss"),
    url: z.string().url(),
    enabled: z.boolean(),
    credibility: z.number().min(0).max(1)
  })),
  marketApis: z.array(z.object({
    id: z.string().min(1),
    enabled: z.boolean(),
    timeoutMs: z.number().int().positive()
  })),
  themeWeights: z.object({
    regulation: z.number().positive(),
    infrastructure: z.number().positive(),
    security: z.number().positive(),
    marketStructure: z.number().positive(),
    aiCrypto: z.number().positive()
  })
}).superRefine((value, ctx) => {
  if (value.selection.min > value.selection.target) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selection", "min"],
      message: "selection.min must be <= selection.target"
    });
  }
});

export const miaConfigSchema = z.object({
  materialDocToken: z.string().min(1),
  xiaohongshuDocToken: z.string().min(1),
  xDocToken: z.string().min(1),
  feishuOpenId: z.string().min(1),
  priorityThemes: z.array(z.string()),
  styleConstraints: z.array(z.string()),
  riskReminders: z.array(z.string())
});
