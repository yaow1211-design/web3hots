import type { CandidateEvent } from "../domain/types.js";

function signature(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["from", "with", "this", "that", "new", "lands", "issues"].includes(word))
    .sort()
    .slice(0, 5)
    .join(" ");
}

function overlap(a: string, b: string): number {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / Math.max(left.size, right.size, 1);
}

export function dedupeCandidates(candidates: CandidateEvent[]): CandidateEvent[] {
  const result: CandidateEvent[] = [];

  for (const candidate of candidates) {
    const candidateSig = signature(candidate.title);
    const existing = result.find((item) =>
      overlap(signature(item.title), candidateSig) >= 0.4 ||
      overlap(item.summary.toLowerCase(), candidate.summary.toLowerCase()) >= 0.35
    );

    if (!existing) {
      result.push({ ...candidate, sources: candidate.sources.map((source) => ({ ...source })) });
      continue;
    }

    existing.sources.push(...candidate.sources.map((source) => ({ ...source })));

    if (new Date(candidate.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
      existing.publishedAt = candidate.publishedAt;
    }
  }

  return result;
}
