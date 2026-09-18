import { getFullUniverse } from "./lib/nasdaq-universe";
import { getUpcomingExDivCandidates } from "./lib/nasdaq-dividend-calendar";
import type { PerformanceFiltered } from "./lib/types";

/**
 * Stage 1: hard filters.
 *
 * Implemented so far: exchange + common-stock only (via the NASDAQ ticker
 * files), and ex-dividend date within the next 14 days (via NASDAQ's free
 * dividend calendar). This is deliberately ordered cheapest-first -- both
 * of these are free, keyless, and do the bulk of the narrowing before any
 * metered API calls happen.
 *
 * TODO (next phase, needs Finnhub + Twelve Data):
 * - Market cap: $2B-$200B+
 * - Liquidity: 20/30-day avg dollar volume >= $10M
 * - Dividend frequency: quarterly/semi-annual/annual only (exclude monthly,
 *   irregular, special) -- derivable from historical calendar data via
 *   fetchDividendCalendarRange, once we know which candidates are worth
 *   checking
 * - Earnings timing: most recent release >= 15 trading days before entry,
 *   next expected release >= 15 trading days after ex-div
 */
export async function runHardFilters(): Promise<PerformanceFiltered[]> {
  const [universe, upcomingCandidates] = await Promise.all([
    getFullUniverse(),
    getUpcomingExDivCandidates(14),
  ]);

  const universeBySymbol = new Map(universe.map((u) => [u.symbol, u]));

  const survivors: PerformanceFiltered[] = [];

  for (const candidate of upcomingCandidates) {
    const universeMatch = universeBySymbol.get(candidate.symbol);
    if (!universeMatch) continue; // not a clean NYSE/NASDAQ common stock

    survivors.push({
      ticker: candidate.symbol,
      companyName: universeMatch.name.replace(/\s*-?\s*common stock$/i, "").trim(),
      exchange: universeMatch.exchange,
      exDivDate: candidate.exDivDate,
      dividendRate: candidate.dividendRate,
      indicatedAnnualDividend: candidate.indicatedAnnualDividend,
    });
  }

  return survivors;
}
