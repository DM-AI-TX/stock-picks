import { fetchDividendCalendarRange } from "./nasdaq-dividend-calendar";

export type DividendFrequency = "quarterly" | "semi-annual" | "annual" | "excluded";

export interface DividendFrequencyResult {
  symbol: string;
  frequency: DividendFrequency;
  historicalExDivCount: number;
  historicalExDivDates: string[];
}

const LOOKBACK_DAYS = 400; // ~13 months -- catches every cadence at least once, with margin

/**
 * Fetch the market-wide dividend calendar ONCE for the trailing
 * LOOKBACK_DAYS and build a symbol -> ex-div dates map. This is the
 * expensive call (one NASDAQ request per weekday in the window, ~280
 * requests at 250ms apart -- a bit over a minute), but it's done once for
 * the whole run rather than once per candidate.
 */
export async function buildHistoricalDividendMap(): Promise<Map<string, string[]>> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - LOOKBACK_DAYS);

  const rows = await fetchDividendCalendarRange(start, end);

  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.symbol || !row.exDivDate) continue;
    const existing = map.get(row.symbol) ?? [];
    existing.push(row.exDivDate);
    map.set(row.symbol, existing);
  }

  for (const dates of map.values()) dates.sort();

  return map;
}

/**
 * Classify a symbol's dividend frequency from its ex-div dates over the
 * lookback window. 4-5 events -> quarterly, 2 -> semi-annual, 1 -> annual.
 * 0, 3, or 6+ all get excluded: 0 shouldn't happen for a candidate with an
 * imminent ex-div date but fails safe; 3 is ambiguous (missed quarter vs.
 * boundary effect) so we don't guess; 6+ means monthly or irregular
 * (including a special dividend layered on a regular schedule).
 */
export function classifyDividendFrequency(symbol: string, exDivDates: string[]): DividendFrequencyResult {
  const count = exDivDates.length;

  let frequency: DividendFrequency;
  if (count === 4 || count === 5) frequency = "quarterly";
  else if (count === 2) frequency = "semi-annual";
  else if (count === 1) frequency = "annual";
  else frequency = "excluded";

  return { symbol, frequency, historicalExDivCount: count, historicalExDivDates: exDivDates };
}

export function getDividendFrequencyForCandidates(
  symbols: string[],
  historicalMap: Map<string, string[]>
): DividendFrequencyResult[] {
  return symbols.map((symbol) => classifyDividendFrequency(symbol, historicalMap.get(symbol) ?? []));
}
