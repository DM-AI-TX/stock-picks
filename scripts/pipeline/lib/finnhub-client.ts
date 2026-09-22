const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function requireApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set in the environment.");
  }
  return key;
}

async function finnhubGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = requireApiKey();
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("token", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Finnhub request failed (${res.status}): ${path}?symbol=${params.symbol ?? ""}`);
  }
  return res.json() as Promise<T>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FinnhubQuote {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  d: number;
  dp: number;
}

export async function getQuote(symbol: string): Promise<FinnhubQuote> {
  return finnhubGet<FinnhubQuote>("/quote", { symbol });
}

export async function getQuotesForUniverse(
  symbols: string[]
): Promise<Array<{ symbol: string; quote: FinnhubQuote }>> {
  const results: Array<{ symbol: string; quote: FinnhubQuote }> = [];

  for (const symbol of symbols) {
    const quote = await getQuote(symbol);
    results.push({ symbol, quote });
    await sleep(1100);
  }

  return results;
}

export async function getBasicFinancials(symbol: string) {
  return finnhubGet<{ metric: Record<string, number> }>("/stock/metric", {
    symbol,
    metric: "all",
  });
}

export interface FinnhubCompanyProfile {
  marketCapitalization: number; // in millions of USD
  name?: string;
  finnhubIndustry?: string;
}

/** Free-tier endpoint. Returns marketCapitalization in millions of USD. */
export async function getCompanyProfile(symbol: string): Promise<FinnhubCompanyProfile> {
  return finnhubGet<FinnhubCompanyProfile>("/stock/profile2", { symbol });
}

export interface MarketCapResult {
  symbol: string;
  marketCapMillions: number | null;
}

/**
 * Sequential market-cap lookup for a list of symbols, throttled to stay
 * under Finnhub's free-tier ~60 calls/minute. Fails soft per symbol --
 * a missing profile shouldn't kill the whole run.
 */
export async function getMarketCapsForUniverse(symbols: string[]): Promise<MarketCapResult[]> {
  const results: MarketCapResult[] = [];
  for (const symbol of symbols) {
    try {
      const profile = await getCompanyProfile(symbol);
      results.push({ symbol, marketCapMillions: profile.marketCapitalization ?? null });
    } catch {
      results.push({ symbol, marketCapMillions: null });
    }
    await sleep(1100);
  }
  return results;
}

export interface FinnhubEarningsEvent {
  date: string; // YYYY-MM-DD
  epsActual: number | null;
  epsEstimate: number | null;
  symbol: string;
}

/** Free-tier supports this per-symbol; the date-range-only (no symbol) variant does not. */
export async function getEarningsCalendar(
  symbol: string,
  fromDate: string,
  toDate: string
): Promise<FinnhubEarningsEvent[]> {
  const data = await finnhubGet<{ earningsCalendar?: FinnhubEarningsEvent[] }>("/calendar/earnings", {
    symbol,
    from: fromDate,
    to: toDate,
  });
  return data.earningsCalendar ?? [];
}

export interface FinnhubHistoricalEarning {
  period: string; // YYYY-MM-DD, the confirmed report date
  actual: number | null;
  estimate: number | null;
}

/**
 * Confirmed past earnings reports for a symbol, most recent first.
 *
 * IMPORTANT: unlike /calendar/earnings, this endpoint returns a BARE ARRAY
 * at the top level, not an object with an earningsCalendar key -- e.g.
 * [{ "actual": 2.56, "estimate": 2.38, "period": "2019-03-31", "symbol": "AAPL" }, ...]
 * Parsing this as { earningsCalendar: [...] } (the /calendar/earnings shape)
 * silently returns undefined/empty every time, which is what caused every
 * candidate to show "no past earnings date found" in the first attempt at
 * this fix.
 */
export async function getHistoricalEarnings(symbol: string): Promise<FinnhubHistoricalEarning[]> {
  const data = await finnhubGet<FinnhubHistoricalEarning[]>("/stock/earnings", { symbol });
  return Array.isArray(data) ? data : [];
}
