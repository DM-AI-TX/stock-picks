import { getQuotesForUniverse } from "./lib/finnhub-client";
import { DIVIDEND_UNIVERSE } from "./lib/dividend-universe";
import type { PerformanceFiltered } from "./lib/types";

export async function runPerformanceFilter(): Promise<PerformanceFiltered[]> {
  const quotes = await getQuotesForUniverse(DIVIDEND_UNIVERSE);

  const filtered: PerformanceFiltered[] = [];

  for (const { symbol, quote } of quotes) {
    const changesPercentage = quote.dp ?? 0;
    const performanceScore = changesPercentage;

    const passesPlaceholderThreshold = true;
    if (!passesPlaceholderThreshold) continue;

    filtered.push({
      ticker: symbol,
      companyName: symbol,
      price: quote.c ?? 0,
      marketCap: 0,
      changesPercentage,
      performanceScore,
    });
  }

  return filtered;
}
