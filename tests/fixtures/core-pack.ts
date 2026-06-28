import type { MiaConfig, ScoredEvent } from "../../src/domain/types.js";

export const mia: MiaConfig = {
  materialDocToken: "material_doc",
  xiaohongshuDocToken: "xhs_doc",
  xDocToken: "x_doc",
  feishuOpenId: "ou_test",
  priorityThemes: ["regulation", "infrastructure"],
  styleConstraints: ["signal over noise"],
  riskReminders: ["do not imply investment advice"]
};

export const event: ScoredEvent = {
  id: "cointelegraph:1",
  title: "SEC issues new stablecoin custody guidance",
  canonicalUrl: "https://cointelegraph.com/news/sec-stablecoin-custody-guidance",
  sources: [
    {
      source: "cointelegraph",
      url: "https://cointelegraph.com/news/sec-stablecoin-custody-guidance",
      publishedAt: "2026-06-28T00:30:00.000Z"
    }
  ],
  publishedAt: "2026-06-28T00:30:00.000Z",
  summary: "The guidance changes reserve and redemption disclosure expectations.",
  theme: "regulation",
  isDuplicate: false,
  initialReason: "within configured time window",
  credibilityScore: 0.82,
  timelinessScore: 1,
  impactScore: 0.9,
  miaAngleScore: 0.8,
  contentPotentialScore: 0.85,
  totalScore: 5.244,
  selectionReason: "selected for structural impact (0.9) and Mia angle (0.8)"
};
