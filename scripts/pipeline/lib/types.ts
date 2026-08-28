export interface UniverseStock {
  ticker: string;
  companyName: string;
  price: number;
  marketCap: number;
  // Raw fields pulled from FMP in Stage 1 — extend as needed.
  changesPercentage?: number;
  yearHigh?: number;
  yearLow?: number;
}

export interface PerformanceFiltered extends UniverseStock {
  performanceScore: number;
}

export interface DividendFiltered extends PerformanceFiltered {
  dividendYield: number;
  payoutRatio: number;
  dividendConsistencyYears?: number;
}

export interface ScoredStock extends DividendFiltered {
  priceLevelScore: number;
  compositeScore: number;
  details: Record<string, unknown>;
}
