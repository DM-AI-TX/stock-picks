/**
 * Pulls dividend calendar data from NASDAQ's own public, keyless JSON API
 * (the same one that powers their website's dividend calendar widget).
 * Unofficial and undocumented, but stable and free -- confirmed working
 * for both NYSE and NASDAQ names, and for both past and future dates.
 *
 * Only accepts one date per call, so pulling a range means looping.
 */

const NASDAQ_DIVIDEND_CALENDAR_URL = "https://api.nasdaq.com/api/calendar/dividends";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export interface DividendCalendarRow {
  companyName: string;
  symbol: string;
  exDivDate: string;
  paymentDate: string;
  recordDate: string;
  dividendRate: number | null;
  indicatedAnnualDividend: number | null;
  announcementDate: string;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "N/A" || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch NASDAQ's public dividend calendar for a single date (YYYY-MM-DD).
 * Fails soft (returns []) rather than throwing, since weekends/holidays
 * legitimately return no rows, and this is an unofficial endpoint that
 * could occasionally hiccup.
 */
export async function fetchDividendCalendarForDate(date: string): Promise<DividendCalendarRow[]> {
  const url = `${NASDAQ_DIVIDEND_CALENDAR_URL}?date=${date}`;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.data?.calendar?.rows;
    if (!Array.isArray(rows)) return [];

    return rows.map((r: Record<string, unknown>) => ({
      companyName: String(r.companyName ?? ""),
      symbol: String(r.symbol ?? "").trim(),
      exDivDate: String(r.dividend_Ex_Date ?? ""),
      paymentDate: String(r.payment_Date ?? ""),
      recordDate: String(r.record_Date ?? ""),
      dividendRate: toNumber(r.dividend_Rate),
      indicatedAnnualDividend: toNumber(r.indicated_Annual_Dividend),
      announcementDate: String(r.announcement_Date ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Get every dividend calendar entry with an ex-dividend date in the next
 * `daysAhead` days (default 14, matching the hard filter). Loops one day
 * at a time since the API only accepts a single date per call.
 */
export async function getUpcomingExDivCandidates(daysAhead = 14): Promise<DividendCalendarRow[]> {
  const all: DividendCalendarRow[] = [];
  const today = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const rows = await fetchDividendCalendarForDate(formatDate(d));
    all.push(...rows);
    await sleep(250); // be polite to an unofficial, unauthenticated endpoint
  }

  // De-duplicate by symbol, keeping the earliest ex-div date if a symbol
  // somehow appears more than once in the window.
  const bySymbol = new Map<string, DividendCalendarRow>();
  for (const row of all) {
    if (!row.symbol) continue;
    const existing = bySymbol.get(row.symbol);
    if (!existing || new Date(row.exDivDate) < new Date(existing.exDivDate)) {
      bySymbol.set(row.symbol, row);
    }
  }

  return Array.from(bySymbol.values());
}

/**
 * Fetch the dividend calendar across a historical date range -- used later
 * to determine dividend frequency and consecutive years for whatever
 * candidates survive the other hard filters. Only call this on an
 * already-narrowed list of dates you actually need; it fetches one
 * business day at a time with no batching, so a multi-year range means
 * many sequential requests.
 */
export async function fetchDividendCalendarRange(startDate: Date, endDate: Date): Promise<DividendCalendarRow[]> {
  const all: DividendCalendarRow[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      const rows = await fetchDividendCalendarForDate(formatDate(current));
      all.push(...rows);
      await sleep(250);
    }
    current.setDate(current.getDate() + 1);
  }

  return all;
}
