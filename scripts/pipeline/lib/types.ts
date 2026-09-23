// scripts/pipeline/lib/types.ts

export interface UniverseStock {
  ticker: string;
  companyName: string;
  exchange: string;
}

export interface HardFilterSurvivor extends UniverseStock {
  exDivDate: string; // as provided by NASDAQ, e.g. "9/22/2026"
  dividendRate: number | null;
  indicatedAnnualDividend: number | null;
}

// Phase B hard filters (dividend frequency, market cap, liquidity, earnings
// timing) all run after the Phase A filters above. The underlying data for
// each is expensive enough (metered Finnhub/Twelve Data calls) that Phase
// C/D reuse it rather than refetching -- so it's carried on
// PerformanceFiltered rather than discarded once the pass/fail check runs.
export type QualifyingDividendFrequency = "quarterly" | "semi-annual" | "annual";

export interface PerformanceFiltered extends HardFilterSurvivor {
  dividendFrequency: QualifyingDividendFrequency;
  historicalExDivCount: number;
  marketCapMillions: number;
  avgDollarVolume20d: number | null;
  avgDollarVolume30d: number | null;
  mostRecentEarningsDate: string | null;
  nextEarningsDate: string | null;
}

// --- Phase C: Finnhub /stock/metric snapshot, carried forward the same way
// Phase B's liquidity/earnings data is, so later scoring factors (Valuation,
// Dividend Quality) don't re-fetch the same metric response Dividend Yield
// scoring already pulled.

export interface FinnhubSeriesPoint {
  period: string; // YYYY-MM-DD
  v: number;
}

export interface FinnhubMetricsSnapshot {
  // Direct fields used by Dividend Yield (factor 1) and Valuation Context (factor 4).
  // All nullable -- free-tier coverage varies by ticker.
  currentDividendYieldTTM: number | null;
  dividendYieldIndicatedAnnual: number | null;
  payoutRatioTTM: number | null;
  netInterestCoverageTTM: number | null;
  forwardPE: number | null;
  evEbitdaTTM: number | null;
  pb: number | null;
  enterpriseValue: number | null; // same units as marketCapitalization (millions)
  marketCapitalization: number | null; // millions of USD

  // Series data used only for derived calculations (see finnhub-metrics.ts):
  // Dividend Yield's stability/growth bonus, and Dividend Quality's
  // debt/EBITDA and consecutive-dividend-years reconstruction.
  annualEbitda: FinnhubSeriesPoint[];
  annualEps: FinnhubSeriesPoint[];
  annualPayoutRatio: FinnhubSeriesPoint[];
}

export interface DividendYieldFactorResult {
  score: number; // 0-28
  yieldUsed: number | null; // the raw currentDividendYieldTTM/indicated value scored
  yieldSource: "currentDividendYieldTTM" | "dividendYieldIndicatedAnnual" | "none";
  trend: "rising" | "stable" | "declining" | "unknown";
  bonusApplied: boolean;
}

export interface DividendFiltered extends PerformanceFiltered {
  dividendYield: number;
  payoutRatio: number;
  finnhubMetrics: FinnhubMetricsSnapshot;
  dividendYieldFactor: DividendYieldFactorResult;
}

// ScoreBreakdown will grow as each of the 6 factors is implemented.
// Fields for not-yet-built factors default to 0 until their scoring
// modules land, so ScoredStock's shape doesn't change again later.
export interface ScoreBreakdown {
  dividendYieldScore: number; // max 28
  liquidityScore: number; // max 23
  dividendQualityScore: number; // max 14
  valuationScore: number; // max 13
  preExBehaviorScore: number; // max 12
  technicalTrendScore: number; // max 10
  totalScore: number; // sum, max 100
}

export interface ScoredStock extends DividendFiltered {
  scores: ScoreBreakdown;
  details: Record<string, unknown>;
}
