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

export interface DividendFiltered extends PerformanceFiltered {
  dividendYield: number;
  payoutRatio: number;
}

export interface ScoredStock extends DividendFiltered {
  priceLevelScore: number;
  compositeScore: number;
  details: Record<string, unknown>;
}
