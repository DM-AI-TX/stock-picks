// scripts/pipeline/lib/dividend-yield-score.ts

import type { DividendYieldFactorResult, FinnhubMetricsSnapshot } from "./types";

/**
 * Factor 1: Dividend Yield, max 28 points, per scoring-algorithm.md.
 *
 * Base score from TTM yield (falls back to indicated-annual yield if TTM
 * is unavailable -- Finnhub's free-tier coverage of currentDividendYieldTTM
 * is inconsistent across tickers):
 *   >=4.5%      -> 28
 *   3.5-4.49%   -> 22
 *   2.75-3.49%  -> 15
 *   2.0-2.74%   -> 7
 *   <2.0%       -> 0
 *
 * +3 bonus (capped at 28) if yield is stable or rising over the last
 * 4-8 quarters. Finnhub's free tier has no dedicated dividend-yield-history
 * series in this endpoint, so the trend is reconstructed: approximate
 * annual dividend-per-share as payoutRatio (annual) x eps (annual) for
 * each year both series report, then compare the most recent year against
 * the prior year. Per David's ways-of-working preference (agreed
 * 2026-09-23), this derivation is used in place of a simpler proxy so the
 * spec's original intent -- yield stability, not just its current level --
 * is preserved rather than dropped.
 */
export function scoreDividendYield(
  metrics: FinnhubMetricsSnapshot | null
): DividendYieldFactorResult {
  if (!metrics) {
    return { score: 0, yieldUsed: null, yieldSource: "none", trend: "unknown", bonusApplied: false };
  }

  let yieldUsed: number | null = metrics.currentDividendYieldTTM;
  let yieldSource: DividendYieldFactorResult["yieldSource"] = "currentDividendYieldTTM";
  if (yieldUsed === null) {
    yieldUsed = metrics.dividendYieldIndicatedAnnual;
    yieldSource = "dividendYieldIndicatedAnnual";
  }
  if (yieldUsed === null) {
    return { score: 0, yieldUsed: null, yieldSource: "none", trend: "unknown", bonusApplied: false };
  }

  let baseScore = 0;
  if (yieldUsed >= 4.5) baseScore = 28;
  else if (yieldUsed >= 3.5) baseScore = 22;
  else if (yieldUsed >= 2.75) baseScore = 15;
  else if (yieldUsed >= 2.0) baseScore = 7;
  else baseScore = 0;

  const trend = deriveDividendTrend(metrics);
  const bonusEligible = trend === "rising" || trend === "stable";
  const score = bonusEligible ? Math.min(28, baseScore + 3) : baseScore;

  return {
    score,
    yieldUsed,
    yieldSource,
    trend,
    bonusApplied: bonusEligible,
  };
}

function deriveDividendTrend(
  metrics: FinnhubMetricsSnapshot
): DividendYieldFactorResult["trend"] {
  // Build { period -> derived DPS } by matching payoutRatio and eps on the
  // same period. Both series come from the same annual report cadence, so
  // periods should align exactly; skip any that don't.
  const epsByPeriod = new Map(metrics.annualEps.map((p) => [p.period, p.v]));
  const derived: Array<{ period: string; dps: number }> = [];

  for (const pr of metrics.annualPayoutRatio) {
    const eps = epsByPeriod.get(pr.period);
    if (eps === undefined || eps <= 0) continue;
    derived.push({ period: pr.period, dps: pr.v * eps });
  }

  // Series are typically newest-first already; sort defensively.
  derived.sort((a, b) => (a.period < b.period ? 1 : -1));

  if (derived.length < 2) return "unknown";

  const latest = derived[0].dps;
  const prior = derived[1].dps;

  if (prior === 0) return "unknown";
  const changeRatio = (latest - prior) / prior;

  if (changeRatio > 0.01) return "rising";
  if (changeRatio >= -0.01) return "stable";
  return "declining";
}
