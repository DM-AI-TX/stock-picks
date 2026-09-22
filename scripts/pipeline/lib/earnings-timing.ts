import { getEarningsCalendar, getHistoricalEarnings } from "./finnhub-client";

const TRADING_DAYS_BUFFER = 15;

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

/** Weekday-only count (doesn't account for market holidays -- same simplification used elsewhere in this pipeline). */
function tradingDaysBetween(a: Date, b: Date): number {
  const [start, end] = a < b ? [a, b] : [b, a];
  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor < end) {
    if (isWeekday(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export interface EarningsTimingResult {
  symbol: string;
  passesEarningsFilter: boolean;
  mostRecentEarningsDate: string | null;
  nextEarningsDate: string | null;
  reason?: string;
}

/**
 * Most recent earnings release >=15 trading days before today, and next
 * expected release >=15 trading days after the ex-div date.
 *
 * Past earnings come from /stock/earnings (confirmed report dates), future
 * earnings from /calendar/earnings -- these are two separate Finnhub calls
 * per candidate, made sequentially (not concurrently) so the combined rate
 * stays under the free tier's 60 calls/minute alongside the per-candidate
 * throttle in getEarningsTimingForUniverse below.
 */
export async function checkEarningsTiming(symbol: string, exDivDate: string): Promise<EarningsTimingResult> {
  const today = new Date();
  const exDiv = new Date(exDivDate);

  const futureFrom = new Date(today);
  const futureTo = new Date(today);
  futureTo.setMonth(futureTo.getMonth() + 6);
  const format = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const historical = await getHistoricalEarnings(symbol);
    const futureEvents = await getEarningsCalendar(symbol, format(futureFrom), format(futureTo));

    const pastDates = historical.map((e) => e.period).filter(Boolean).sort();
    const mostRecent = pastDates.length > 0 ? pastDates[pastDates.length - 1] : null;

    const futureDates = futureEvents.map((e) => e.date).filter(Boolean).sort();
    const next = futureDates.length > 0 ? futureDates[0] : null;

    if (mostRecent === null && next === null) {
      return {
        symbol,
        passesEarningsFilter: false,
        mostRecentEarningsDate: null,
        nextEarningsDate: null,
        reason: "no earnings data",
      };
    }

    const recentOk = mostRecent !== null && tradingDaysBetween(new Date(mostRecent), today) >= TRADING_DAYS_BUFFER;
    const nextOk = next !== null && tradingDaysBetween(exDiv, new Date(next)) >= TRADING_DAYS_BUFFER;

    let reason: string | undefined;
    if (mostRecent === null) reason = "no past earnings date found";
    else if (!recentOk) reason = "too close to last earnings";
    else if (next === null) reason = "no next earnings date found";
    else if (!nextOk) reason = "too close to next earnings";

    return {
      symbol,
      // If we have no past date at all, we can't confirm the recent-earnings
      // requirement -- fail safe rather than assume it passes.
      passesEarningsFilter: mostRecent !== null && recentOk && next !== null && nextOk,
      mostRecentEarningsDate: mostRecent,
      nextEarningsDate: next,
      reason,
    };
  } catch {
    return {
      symbol,
      passesEarningsFilter: false,
      mostRecentEarningsDate: null,
      nextEarningsDate: null,
      reason: "finnhub request failed",
    };
  }
}

export async function getEarningsTimingForUniverse(
  candidates: Array<{ symbol: string; exDivDate: string }>
): Promise<EarningsTimingResult[]> {
  const results: EarningsTimingResult[] = [];
  for (const c of candidates) {
    results.push(await checkEarningsTiming(c.symbol, c.exDivDate));
    // Two Finnhub calls happen inside checkEarningsTiming now (past +
    // future), so this per-candidate delay is doubled from the original
    // 1100ms to keep the combined rate under the free tier's 60/min cap.
    await new Promise((resolve) => setTimeout(resolve, 2200));
  }
  return results;
}
