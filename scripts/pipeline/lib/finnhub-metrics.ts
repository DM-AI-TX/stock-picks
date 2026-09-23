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
 * both are reconstructed from these series in dividend-quality-score.ts and
 * dividend-yield-score.ts respectively.
 *
 * NOTE ON UNITS: currentDividendYieldTTM and dividendYieldIndicatedAnnual
 * come back from Finnhub already in percentage-point units (e.g. 0.31 means
 * 0.31%), not as a 0-1 fraction. payoutRatioTTM/payoutRatioAnnual ARE plain
 * 0-1 fractions. Confirmed against a live AAPL response. Scoring thresholds
 * in scoring-algorithm.md are applied directly against these raw values.
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
    payoutRatioAnnual: numOrNull(metric, "payoutRatioAnnual"),
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
