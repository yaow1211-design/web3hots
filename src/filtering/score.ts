import type { CandidateEvent, DefaultConfig, ScoredEvent } from "../domain/types.js";

function hasPricePrediction(event: CandidateEvent): boolean {
  return /(price|target|analyst|trader|may reach|this week)/i.test(`${event.title} ${event.summary}`);
}

function impactScore(event: CandidateEvent): number {
  const text = `${event.title} ${event.summary}`.toLowerCase();

  if (/(guidance|regulator|reserve|redemption|custody|exploit|vulnerability|foundation|validator)/.test(text)) {
    return 0.9;
  }

  if (/(launch|partnership|funding|volume|flow)/.test(text)) {
    return 0.6;
  }

  return 0.35;
}

function themeWeightFor(event: CandidateEvent, config: DefaultConfig): number {
  return event.theme === "other" ? 0.7 : config.themeWeights[event.theme];
}

export function scoreCandidates(candidates: CandidateEvent[], config: DefaultConfig): ScoredEvent[] {
  const credibilityBySource = new Map(config.sources.map((source) => [source.id, source.credibility]));

  return candidates.map((event) => {
    const credibilityScore = Math.max(...event.sources.map((source) => credibilityBySource.get(source.source) ?? 0.5));
    const timelinessScore = 1;
    const structuralImpact = impactScore(event);
    const miaAngleScore = event.theme === "other" ? 0.35 : 0.8;
    const contentPotentialScore = event.sources.length > 1 ? 0.85 : 0.65;
    const themeWeight = themeWeightFor(event, config);
    const totalScore = Number(((credibilityScore + timelinessScore + structuralImpact + miaAngleScore + contentPotentialScore) * themeWeight).toFixed(3));
    const rejectionReason = hasPricePrediction(event) ? "low-signal price prediction" : undefined;

    return {
      ...event,
      credibilityScore,
      timelinessScore,
      impactScore: structuralImpact,
      miaAngleScore,
      contentPotentialScore,
      totalScore,
      rejectionReason,
      selectionReason: rejectionReason ? undefined : `selected for structural impact (${structuralImpact}) and Mia angle (${miaAngleScore})`
    };
  });
}
