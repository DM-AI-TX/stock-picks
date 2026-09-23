// scripts/pipeline/lib/finnhub-metrics.ts

import { getBasicFinancials } from "./finnhub-client";
import type { FinnhubMetricsSnapshot, FinnhubSeriesPoint } from "./types";

interface RawFinnhubMetricResponse {
  metric: Record<string, number>;
  series?: {
    annual?: Record<string, FinnhubSeriesPoint[]>;
  };
}

function seriesOrEmpty(
  series: Record<string, FinnhubSeriesPoint[]> | undefined,
  key: string
): FinnhubSeriesPoint[] {
  return series?.[key] ?? [];
}

function numOrNull(metric: Record<string, number>, key: string): number | null {
  const v = metric[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/**
 * Fetches Finnhub's /stock/metric?metric=all response for a symbol and
 * extracts the fields Phase C scoring needs, plus the raw annual series
 * required for derived calculations (debt/EBITDA, consecutive-dividend-years,
 * dividend trend). See ways-of-working notes: Finnhub's free tier does NOT
 * expose debt/EBITDA or a dedicated dividend-history series directly --
 * both are reconstructed from these series in dividend-quality.ts and
 * dividend-yield-score.ts respectively.
 *
 * NOTE ON UNITS: currentDividendYieldTTM and dividendYieldIndicatedAnnual
 * come back from Finnhub already in percentage-point units (e.g. 0.31 means
 * 0.31%), not as a 0-1 fraction. Confirmed against a live AAPL response
 * where currentDividendYieldTTM: 0.3139 matched AAPL's real ~0.3% yield.
 * Scoring thresholds in scoring-algorithm.md (>=4.5%, etc.) are applied
 * directly against this raw value -- do not multiply by 100.
 */
export async function getFinnhubMetricsSnapshot(
  symbol: string
): Promise<FinnhubMetricsSnapshot | null> {
  let data: RawFinnhubMetricResponse;
  try {
    data = (await getBasicFinancials(symbol)) as unknown as RawFinnhubMetricResponse;
  } catch {
    return null;
  }

  const metric = data.metric ?? {};
  const annual = data.series?.annual;

  return {
    currentDividendYieldTTM: numOrNull(metric, "currentDividendYieldTTM"),
    dividendYieldIndicatedAnnual: numOrNull(metric, "dividendYieldIndicatedAnnual"),
    payoutRatioTTM: numOrNull(metric, "payoutRatioTTM"),
    netInterestCoverageTTM: numOrNull(metric, "netInterestCoverageTTM"),
    forwardPE: numOrNull(metric, "forwardPE"),
    evEbitdaTTM: numOrNull(metric, "evEbitdaTTM"),
    pb: numOrNull(metric, "pb"),
    enterpriseValue: numOrNull(metric, "enterpriseValue"),
    marketCapitalization: numOrNull(metric, "marketCapitalization"),
    annualEbitda: seriesOrEmpty(annual, "ebitda"),
    annualEps: seriesOrEmpty(annual, "eps"),
    annualPayoutRatio: seriesOrEmpty(annual, "payoutRatio"),
  };
}
