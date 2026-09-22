import { getEarningsCalendar } from "./finnhub-client";

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
 * expected release >=15 trading days after the ex-div date. Fails soft
 * (excludes the candidate) if Finnhub has no data, since free-tier
 * earnings-calendar coverage is uneven across smaller names.
 */
export async function checkEarningsTiming(symbol: string, exDivDate: string): Promise<EarningsTimingResult> {
  const today = new Date();
  const exDiv = new Date(exDivDate);

  const from = new Date(today);
  from.setMonth(from.getMonth() - 6);
  const to = new Date(today);
  to.setMonth(to.getMonth() + 6);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const events = await getEarningsCalendar(symbol, format(from), format(to));
    if (events.length === 0) {
      return {
        symbol,
        passesEarningsFilter: false,
        mostRecentEarningsDate: null,
        nextEarningsDate: null,
        reason: "no earnings data",
      };
    }

    const dates = events.map((e) => e.date).filter(Boolean).sort();
    const past = dates.filter((d) => new Date(d) <= today);
    const future = dates.filter((d) => new Date(d) > today);

    const mostRecent = past.length > 0 ? past[past.length - 1] : null;
    const next = future.length > 0 ? future[0] : null;

    const recentOk = mostRecent !== null && tradingDaysBetween(new Date(mostRecent), today) >= TRADING_DAYS_BUFFER;
    const nextOk = next !== null && tradingDaysBetween(exDiv, new Date(next)) >= TRADING_DAYS_BUFFER;

    return {
      symbol,
      passesEarningsFilter: recentOk && nextOk,
      mostRecentEarningsDate: mostRecent,
      nextEarningsDate: next,
      reason: !recentOk ? "too close to last earnings" : !nextOk ? "too close to next earnings" : undefined,
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
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return results;
}
