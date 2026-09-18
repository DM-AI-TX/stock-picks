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

// Stage 1 currently only implements the exchange/common-stock and
// ex-div-within-2-weeks hard filters. Market cap, earnings timing, and
// dividend-frequency classification are added in a later phase -- this
// type will grow then.
export type PerformanceFiltered = HardFilterSurvivor;

export interface DividendFiltered extends PerformanceFiltered {
  dividendYield: number;
  payoutRatio: number;
}

export interface ScoredStock extends DividendFiltered {
  priceLevelScore: number;
  compositeScore: number;
  details: Record<string, unknown>;
}
