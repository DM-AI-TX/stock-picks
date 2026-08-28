import { getScreenerUniverse } from "./lib/fmp-client";
import type { PerformanceFiltered } from "./lib/types";

/**
 * Stage 1: pull the stock universe and filter down to stocks with strong
 * recent performance (returns, revenue/earnings trends, etc.)
 *
 * This runs against the FULL universe, so keep it to batch/screener calls —
 * this is the one stage where call count really matters.
 *
 * TODO: define what "recent performance" means for your algorithm —
 * e.g. trailing N-day return above X%, positive earnings surprise last
 * quarter, revenue growth YoY above some threshold. Replace the placeholder
 * filter below.
 */
export async function runPerformanceFilter(): Promise<PerformanceFiltered[]> {
  const universe = await getScreenerUniverse({
    // TODO: tune these screener params — this is a starting point, not a
    // final decision. Pushing filtering into the screener call itself saves
    // you from having to filter a huge list client-side.
    marketCapMoreThan: "300000000", // e.g. exclude micro-caps
    isEtf: "false",
    isActivelyTrading: "true",
  });

  const filtered: PerformanceFiltered[] = [];

  for (const stock of universe) {
    // TODO: replace this placeholder with your actual performance criteria.
    const changesPercentage = Number(stock.changesPercentage ?? 0);
    const performanceScore = changesPercentage; // placeholder scoring

    const passesPlaceholderThreshold = changesPercentage > 0;
    if (!passesPlaceholderThreshold) continue;

    filtered.push({
      ticker: String(stock.symbol),
      companyName: String(stock.companyName ?? ""),
      price: Number(stock.price ?? 0),
      marketCap: Number(stock.marketCap ?? 0),
      changesPercentage,
      performanceScore,
    });
  }

  return filtered;
}
