import { getDividendHistory, getFinancialRatios } from "./lib/fmp-client";
import type { PerformanceFiltered, DividendFiltered } from "./lib/types";

/**
 * Stage 2: narrow the Stage 1 survivors down to consistent dividend payers.
 *
 * This runs one-ticker-at-a-time calls (dividend history, ratios), but only
 * against the much smaller list that survived Stage 1 — that's the whole
 * point of the funnel, so keep Stage 1 doing the heavy lifting on filtering.
 *
 * TODO: define your actual dividend criteria — minimum yield, maximum
 * payout ratio (too high can signal an unsustainable dividend), minimum
 * years of consecutive payments, etc.
 */
export async function runDividendFilter(
  candidates: PerformanceFiltered[]
): Promise<DividendFiltered[]> {
  const survivors: DividendFiltered[] = [];

  for (const stock of candidates) {
    const [dividendHistory, ratios] = await Promise.all([
      getDividendHistory(stock.ticker),
      getFinancialRatios(stock.ticker),
    ]);

    // TODO: parse actual yield/payout ratio out of the FMP responses —
    // shape depends on the exact endpoint response, check the docs.
    const dividendYield = Number((ratios?.[0] as Record<string, unknown>)?.dividendYield ?? 0);
    const payoutRatio = Number((ratios?.[0] as Record<string, unknown>)?.payoutRatio ?? 0);

    // Placeholder threshold — not a real dividend-quality check.
    const passesPlaceholderThreshold = dividendYield > 0;
    if (!passesPlaceholderThreshold) continue;

    survivors.push({
      ...stock,
      dividendYield,
      payoutRatio,
    });
  }

  return survivors;
}
