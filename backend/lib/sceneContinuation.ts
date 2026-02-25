export type ContinuationMode = 'off' | 'strict' | 'balanced' | 'loose';

export type ContinuationEvaluationInput = {
  continuationMode: ContinuationMode;
  hasAnchor: boolean;
  directorLayer: string;
  cinematographerLayer: string;
  threshold: number;
};

export type ContinuationEvaluation = {
  score: number;
  recommendRegenerate: boolean;
  reason: string;
};

export const evaluateSceneContinuation = (args: ContinuationEvaluationInput): ContinuationEvaluation => {
  const mode = args.continuationMode || 'strict';
  if (mode === 'off') {
    const score = 1;
    return {
      score,
      recommendRegenerate: false,
      reason: 'Continuation mode is off. Regeneration is user-directed.',
    };
  }
  let score = mode === 'strict' ? 0.62 : mode === 'balanced' ? 0.72 : 0.8;
  if (args.hasAnchor) score += 0.18;
  if (String(args.directorLayer || '').trim().length > 24) score += 0.05;
  if (String(args.cinematographerLayer || '').trim().length > 24) score += 0.07;
  if (mode === 'strict' && !args.hasAnchor) score -= 0.08;
  score = Math.max(0, Math.min(1, score));

  const threshold = Math.max(0, Math.min(1, Number(args.threshold || 0.75)));
  const recommendRegenerate = score < threshold;
  const reason = recommendRegenerate
    ? (args.hasAnchor
        ? `Continuation score ${score.toFixed(2)} is below threshold ${threshold.toFixed(2)}. Consider tightening cinematic constraints and resubmitting.`
        : `Continuation score ${score.toFixed(2)} is below threshold ${threshold.toFixed(2)}. Add an anchor scene frame for stronger continuity.`)
    : `Continuation score ${score.toFixed(2)} meets threshold ${threshold.toFixed(2)}.`;

  return { score, recommendRegenerate, reason };
};
