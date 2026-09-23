// scripts/pipeline/lib/dividend-quality-score.ts

import type { DividendQualityFactorResult, FinnhubMetricsSnapshot, FinnhubSeriesPoint } from "./types";

/**
 * Factor 3: Dividend Quality & Financial Health, max 14 points, per
 * scoring-algorithm.md.
 *
 *   10+ years consecutive + payout <=60% + healthy balance sheet -> 14
 *   5-9 years + payout <=70%                                      -> 9
 *   Regular payer (1+ years), payout <=85%                        -> 4
 *   No dividend history this year, or payout >85% (distress)      -> 0
 *
 * Two of the three inputs Finnhub's free tier doesn't expose directly and
 * are reconstructed here, per David's ways-of-working preference (agreed
 * 2026-09-23) to keep every scoring field faithful to the original spec
 * rather than substituting a simpler proxy:
 *
 * - Consecutive dividend years: Finnhub has no dedicated dividend-history
 *   series in this endpoint. Reconstructed by counting how many consecutive
 *   calendar years (walking backward from the most recent) report a
 *   nonzero annual payoutRatio -- a year with no payoutRatio entry, or a
 *   zero one, breaks the streak.
 *
 * - Debt/EBITDA: not a named Finnhub field. Reconstructed as
 *   (enterpriseValue - marketCapitalization) / most-recent-annual-EBITDA,
 *   using the raw dollar figures Finnhub does provide. A negative result
 *   (net cash position) is treated as healthy regardless of the interest-
 *   coverage check.
 *
 * "Healthy balance sheet" (revised after discussion 2026-09-23): the
 * original spec says "a basic debt metric (debt/EBITDA OR interest
 * coverage)" -- an "or", not a requirement for both. This now passes if
 * EITHER metric clears its bar: interest coverage >=5x, OR debt/EBITDA
 * <=4x (loosened from an earlier stricter 3x, since dividend-heavy sectors
 * like utilities and REITs routinely run 4-5x leverage as a normal feature
 * of the business model, not distress). A missing metric doesn't fail the
 * check by itself -- only having both metrics unavailable, or both failing
 * their bar, results in an unhealthy balance sheet.
 */
export function scoreDividendQuality(
  metrics: FinnhubMetricsSnapshot | null
): DividendQualityFactorResult {
  if (!metrics) {
    return {
      score: 0,
      consecutiveDividendYears: 0,
      payoutRatioUsed: null,
      payoutRatioSource: "none",
      debtToEbitda: null,
      interestCoverage: null,
      healthyBalanceSheet: false,
    };
  }

  const consecutiveDividendYears = countConsecutiveDividendYears(metrics.annualPayoutRatio);

  let payoutRatioUsed: number | null = metrics.payoutRatioTTM;
  let payoutRatioSource: DividendQualityFactorResult["payoutRatioSource"] = "payoutRatioTTM";
  if (payoutRatioUsed === null) {
    payoutRatioUsed = metrics.payoutRatioAnnual;
    payoutRatioSource = "payoutRatioAnnual";
  }
  if (payoutRatioUsed === null) {
    payoutRatioSource = "none";
  }

  const debtToEbitda = deriveDebtToEbitda(metrics);
  const interestCoverage = metrics.netInterestCoverageTTM;

  const interestCoverageHealthy = interestCoverage !== null && interestCoverage >= 5;
  const debtToEbitdaHealthy = debtToEbitda !== null && debtToEbitda <= 4;
  const healthyBalanceSheet = interestCoverageHealthy || debtToEbitdaHealthy;

  let score = 0;
  if (
    consecutiveDividendYears >= 10 &&
    payoutRatioUsed !== null &&
    payoutRatioUsed <= 0.6 &&
    healthyBalanceSheet
  ) {
    score = 14;
  } else if (
    consecutiveDividendYears >= 5 &&
    payoutRatioUsed !== null &&
    payoutRatioUsed <= 0.7
  ) {
    score = 9;
  } else if (
    consecutiveDividendYears >= 1 &&
    payoutRatioUsed !== null &&
    payoutRatioUsed <= 0.85
  ) {
    score = 4;
  } else {
    score = 0;
  }

  return {
    score,
    consecutiveDividendYears,
    payoutRatioUsed,
    payoutRatioSource,
    debtToEbitda,
    interestCoverage,
    healthyBalanceSheet,
  };
}

function countConsecutiveDividendYears(annualPayoutRatio: FinnhubSeriesPoint[]): number {
  const years = Array.from(
    new Set(
      annualPayoutRatio
        .filter((p) => p.v > 0)
        .map((p) => parseInt(p.period.slice(0, 4), 10))
    )
  ).sort((a, b) => b - a);

  if (years.length === 0) return 0;

  let count = 1;
  for (let i = 1; i < years.length; i++) {
    if (years[i - 1] - years[i] === 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function mostRecentAnnualValue(series: FinnhubSeriesPoint[]): number | null {
  if (series.length === 0) return null;
  const sorted = [...series].sort((a, b) => (a.period < b.period ? 1 : -1));
  return sorted[0].v;
}

function deriveDebtToEbitda(metrics: FinnhubMetricsSnapshot): number | null {
  if (metrics.enterpriseValue === null || metrics.marketCapitalization === null) return null;
  const ebitda = mostRecentAnnualValue(metrics.annualEbitda);
  if (ebitda === null || ebitda <= 0) return null;
  const netDebt = metrics.enterpriseValue - metrics.marketCapitalization;
  return netDebt / ebitda;
}
