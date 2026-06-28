import type { ScoredEvent } from "../domain/types.js";

export function selectEvents(events: ScoredEvent[], target: number): ScoredEvent[] {
  return events
    .filter((event) => !event.rejectionReason)
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, target);
}
