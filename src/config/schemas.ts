import { z } from "zod";

export const envSchema = z.object({
  FEISHU_APP_ID: z.string().min(1),
  FEISHU_APP_SECRET: z.string().min(1)
});

const storageConfigSchema = z.object({
  provider: z.literal("local"),
  freePlan: z.literal("supabase"),
  supabase: z.object({
    enabled: z.custom<false>((enabled) => enabled === false, {
      message: "storage.supabase.enabled must stay false until cloud persistence is implemented"
    }),
    projectUrlEnv: z.literal("SUPABASE_URL"),
    serviceRoleKeyEnv: z.literal("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: z.string().min(1),
    tables: z.object({
      coreRuns: z.string().min(1),
      socialRuns: z.string().min(1)
    })
  })
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
  storage: storageConfigSchema,
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
