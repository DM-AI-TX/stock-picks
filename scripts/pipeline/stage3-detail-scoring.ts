import type { DividendFiltered, ScoredStock } from "./lib/types";

/**
 * Stage 3: full scoring engine -- TEMPORARILY SIMPLIFIED.
 *
 * Placeholder pass-through while Phase C (the real 6-factor, 100-point
 * scoring system) gets built.
 */
export async function runDetailScoring(
  candidates: DividendFiltered[]
): Promise<ScoredStock[]> {
  const scored: ScoredStock[] = candidates.map((stock) => ({
    ...stock,
    priceLevelScore: 0,
    compositeScore: stock.indicatedAnnualDividend ?? 0, // placeholder ranking signal
    details: {},
  }));

  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}
