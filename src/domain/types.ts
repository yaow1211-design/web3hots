export type SourceType = "rss";
export type Theme = "regulation" | "infrastructure" | "security" | "marketStructure" | "aiCrypto" | "other";

export interface SourceConfig {
  id: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  credibility: number;
}

export interface MarketApiConfig {
  id: string;
  enabled: boolean;
  timeoutMs: number;
}

export interface DefaultConfig {
  timezone: string;
  defaultWindowHours: number;
  outputDir: string;
  logFile: string;
  selection: { min: number; target: number };
  sources: SourceConfig[];
  marketApis: MarketApiConfig[];
  themeWeights: Record<Exclude<Theme, "other">, number>;
}

export interface MiaConfig {
  materialDocToken: string;
  xiaohongshuDocToken: string;
  xDocToken: string;
  feishuOpenId: string;
  priorityThemes: string[];
  styleConstraints: string[];
  riskReminders: string[];
}

export interface EnvConfig {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
}

export interface AppConfig {
  rootDir: string;
  env: EnvConfig;
  defaultConfig: DefaultConfig;
  mia: MiaConfig;
}

export interface SourceItem {
  id: string;
  source: string;
  sourceType: SourceType;
  title: string;
  url: string;
  publishedAt: string;
  summary: string;
  rawText: string;
  fetchedAt: string;
}

export interface CandidateEvent {
  id: string;
  title: string;
  canonicalUrl: string;
  sources: Array<{ source: string; url: string; publishedAt: string }>;
  publishedAt: string;
  summary: string;
  theme: Theme;
  isDuplicate: boolean;
  duplicateOf?: string;
  initialReason: string;
}

export interface ScoredEvent extends CandidateEvent {
  credibilityScore: number;
  timelinessScore: number;
  impactScore: number;
  miaAngleScore: number;
  contentPotentialScore: number;
  totalScore: number;
  selectionReason?: string;
  rejectionReason?: string;
}

export interface MarketSnapshot {
  btcUsd?: number;
  ethUsd?: number;
  btcChange24h?: number;
  ethChange24h?: number;
  trendSummary: string;
  sources: string[];
  degraded: boolean;
  degradationReason?: string;
  fetchedAt: string;
}

export interface FeishuWriteResult {
  ok: boolean;
  docToken: string;
  url?: string;
  error?: string;
}

export interface FeishuDmResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface CorePack {
  runId: string;
  date: string;
  status?: "ok" | "degraded" | "failed";
  window: string;
  sourceHealth: Array<{ source: string; ok: boolean; itemCount: number; error?: string }>;
  selectedEvents: ScoredEvent[];
  marketSnapshot: MarketSnapshot;
  generationPrompt: string;
  markdownPath: string;
  jsonPath: string;
  feishuWriteResult?: FeishuWriteResult;
  dmResult?: FeishuDmResult;
}

export interface SocialPack {
  runId: string;
  date: string;
  sourceCoreRunId: string;
  selectedTopics: ScoredEvent[];
  xiaohongshuPrompt: string;
  chineseXPrompt: string;
  englishXPrompt: string;
  factBoundaries: string[];
  riskReminders: string[];
  markdownPath: string;
  jsonPath: string;
  feishuWriteResults?: FeishuWriteResult[];
  dmResult?: FeishuDmResult;
}

export interface RunRecord {
  runId: string;
  command: "daily-core" | "daily-social-pack";
  startedAt: string;
  endedAt?: string;
  status: "running" | "ok" | "degraded" | "failed";
  errors: string[];
  degradations: string[];
  outputPaths: string[];
  sourceStats: Array<{ source: string; ok: boolean; itemCount: number; error?: string }>;
  feishuStats: Array<FeishuWriteResult | FeishuDmResult>;
}
