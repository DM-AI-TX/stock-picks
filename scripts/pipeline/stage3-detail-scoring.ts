import { getRecentPriceHistory } from "./lib/fmp-client";
import type { DividendFiltered, ScoredStock } from "./lib/types";

/**
 * Stage 3: on the (now small) list of dividend payers that passed Stage 2,
 * pull recent price history and score on key price levels + any remaining
 * fundamental details, producing a final composite score.
 *
 * TODO: define what "key price levels" means for your algorithm — e.g.
 * distance from 52-week high/low, position relative to 50/200-day moving
 * average, recent support/resistance. Replace the placeholder scoring.
 *
 * TODO: decide how technical score and dividend/fundamental score combine
 * into compositeScore — a simple weighted average is a reasonable start.
 */
export async function runDetailScoring(
  candidates: DividendFiltered[]
): Promise<ScoredStock[]> {
  const scored: ScoredStock[] = [];

  for (const stock of candidates) {
    const priceHistory = await getRecentPriceHistory(stock.ticker, 60);

    // TODO: compute actual price-level signals from priceHistory
    // (e.g. moving averages, distance from recent high/low).
    const priceLevelScore = 0; // placeholder

    const compositeScore =
      stock.performanceScore * 0.4 + stock.dividendYield * 0.3 + priceLevelScore * 0.3;

    scored.push({
      ...stock,
      priceLevelScore,
      compositeScore,
      details: {
        // Stash any extra fields you want available in the UI without
        // needing another API call — recent price snapshot, notes, etc.
      },
    });
  }

  // Highest composite score first.
  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}
