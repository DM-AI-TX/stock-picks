import { getFullUniverse } from "./lib/nasdaq-universe";
import { getUpcomingExDivCandidates } from "./lib/nasdaq-dividend-calendar";
import { getMarketCapsForUniverse } from "./lib/finnhub-client";
import { getLiquidityForUniverse } from "./lib/twelvedata-liquidity";
import { buildHistoricalDividendMap, getDividendFrequencyForCandidates } from "./lib/dividend-frequency";
import { getEarningsTimingForUniverse } from "./lib/earnings-timing";
import type { HardFilterSurvivor, PerformanceFiltered, QualifyingDividendFrequency } from "./lib/types";

const MIN_MARKET_CAP_MILLIONS = 2_000; // $2B. No upper bound enforced -- spec is "$200+ billion", i.e. larger is fine.

/**
 * Stage 1: hard filters.
 *
 * Ordered cheapest-first. Phase A (free, keyless) narrows first: exchange
 * + common-stock only, then ex-div date within 14 days. Phase B then
 * narrows further, cheapest metered call first: dividend frequency is one
 * market-wide fetch shared across all candidates, so it runs before the
 * per-candidate Finnhub/Twelve Data calls (market cap, liquidity, earnings
 * timing) -- a candidate excluded here never burns those calls.
 *
 * Every Phase B data point used to decide pass/fail is carried forward on
 * the returned PerformanceFiltered objects (see lib/types.ts) so Phase C
 * and the PicksTable (Phase D) can reuse it instead of refetching.
 *
 * Logs a count after each sub-filter so a run's console output shows
 * exactly where candidates got dropped, rather than just a final total.
 */
export async function runHardFilters(): Promise<PerformanceFiltered[]> {
  const [universe, upcomingCandidates] = await Promise.all([
    getFullUniverse(),
    getUpcomingExDivCandidates(14),
  ]);

  const universeBySymbol = new Map(universe.map((u) => [u.symbol, u]));

  const phaseASurvivors: HardFilterSurvivor[] = [];

  for (const candidate of upcomingCandidates) {
    const universeMatch = universeBySymbol.get(candidate.symbol);
    if (!universeMatch) continue; // not a clean NYSE/NASDAQ common stock

    phaseASurvivors.push({
      ticker: candidate.symbol,
      companyName: universeMatch.name.replace(/\s*-?\s*common stock$/i, "").trim(),
      exchange: universeMatch.exchange,
      exDivDate: candidate.exDivDate,
      dividendRate: candidate.dividendRate,
      indicatedAnnualDividend: candidate.indicatedAnnualDividend,
    });
  }

  console.log(`  Phase A (exchange + ex-div window): ${phaseASurvivors.length} candidates`);
  if (phaseASurvivors.length === 0) return [];

  // --- Dividend frequency ---
  const historicalDividendMap = await buildHistoricalDividendMap();
  const frequencyResults = getDividendFrequencyForCandidates(
    phaseASurvivors.map((s) => s.ticker),
    historicalDividendMap
  );
  const frequencyBySymbol = new Map(frequencyResults.map((r) => [r.symbol, r]));

  const afterFrequency = phaseASurvivors.filter((s) => {
    const freq = frequencyBySymbol.get(s.ticker)?.frequency;
    return freq === "quarterly" || freq === "semi-annual" || freq === "annual";
  });

  console.log(
    `  Phase B - dividend frequency: ${afterFrequency.length}/${phaseASurvivors.length} survived` +
      ` (dropped: ${phaseASurvivors.length - afterFrequency.length})`
  );
  if (afterFrequency.length === 0) return [];

  // --- Market cap ---
  const marketCaps = await getMarketCapsForUniverse(afterFrequency.map((s) => s.ticker));
  const marketCapBySymbol = new Map(marketCaps.map((m) => [m.symbol, m.marketCapMillions]));

  const afterMarketCap = afterFrequency.filter((s) => {
    const cap = marketCapBySymbol.get(s.ticker);
    return cap !== null && cap !== undefined && cap >= MIN_MARKET_CAP_MILLIONS;
  });

  console.log(
    `  Phase B - market cap: ${afterMarketCap.length}/${afterFrequency.length} survived` +
      ` (dropped: ${afterFrequency.length - afterMarketCap.length})`
  );
  if (afterMarketCap.length === 0) return [];

  // --- Liquidity ---
  const liquidityResults = await getLiquidityForUniverse(afterMarketCap.map((s) => s.ticker));
  const liquidityBySymbol = new Map(liquidityResults.map((l) => [l.symbol, l]));

  const afterLiquidity = afterMarketCap.filter(
    (s) => liquidityBySymbol.get(s.ticker)?.passesLiquidityFilter === true
  );

  console.log(
    `  Phase B - liquidity: ${afterLiquidity.length}/${afterMarketCap.length} survived` +
      ` (dropped: ${afterMarketCap.length - afterLiquidity.length})`
  );
  if (afterLiquidity.length === 0) return [];

  // --- Earnings timing ---
  const earningsResults = await getEarningsTimingForUniverse(
    afterLiquidity.map((s) => ({ symbol: s.ticker, exDivDate: s.exDivDate }))
  );
  const earningsBySymbol = new Map(earningsResults.map((e) => [e.symbol, e]));

  const finalSurvivors = afterLiquidity.filter(
    (s) => earningsBySymbol.get(s.ticker)?.passesEarningsFilter === true
  );

  console.log(
    `  Phase B - earnings timing: ${finalSurvivors.length}/${afterLiquidity.length} survived` +
      ` (dropped: ${afterLiquidity.length - finalSurvivors.length})`
  );

  // --- Assemble enriched PerformanceFiltered objects, reusing every data
  // point already fetched above instead of refetching in later phases. ---
  return finalSurvivors.map((s): PerformanceFiltered => {
    const frequency = frequencyBySymbol.get(s.ticker)!;
    const marketCap = marketCapBySymbol.get(s.ticker)!;
    const liquidity = liquidityBySymbol.get(s.ticker)!;
    const earnings = earningsBySymbol.get(s.ticker)!;

    return {
      ...s,
      dividendFrequency: frequency.frequency as QualifyingDividendFrequency,
      historicalExDivCount: frequency.historicalExDivCount,
      marketCapMillions: marketCap,
      avgDollarVolume20d: liquidity.avgDollarVolume20d,
      avgDollarVolume30d: liquidity.avgDollarVolume30d,
      mostRecentEarningsDate: earnings.mostRecentEarningsDate,
      nextEarningsDate: earnings.nextEarningsDate,
    };
  });
}
