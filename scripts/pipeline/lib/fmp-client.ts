/**
 * Thin wrapper around the Financial Modeling Prep API.
 *
 * Free tier is 250 requests/day with a 500MB/30-day bandwidth cap, so this
 * client leans on FMP's *batch* endpoints wherever possible — one call for
 * many tickers, rather than one call per ticker. Keep it that way as you
 * fill in the pipeline stages: prefer /quote/AAPL,MSFT,... over looping.
 */

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

function requireApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error("FMP_API_KEY is not set in the environment.");
  }
  return key;
}

async function fmpGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = requireApiKey();
  const url = new URL(`${FMP_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`FMP request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Get the full stock screener universe in as few calls as possible.
 * FMP's /stock-screener endpoint supports filtering server-side (market cap,
 * volume, sector, etc.) — push as much filtering here as you can, since it
 * reduces what you need to filter client-side in Stage 1.
 *
 * TODO: tune query params (marketCapMoreThan, volumeMoreThan, etc.) to match
 * whatever "universe" you want to start from.
 */
export async function getScreenerUniverse(params: Record<string, string> = {}) {
  return fmpGet<Array<Record<string, unknown>>>("/stock-screener", {
    limit: "1000",
    ...params,
  });
}

/**
 * Batch quote lookup — pass up to ~100 tickers comma-separated in a single call.
 */
export async function getBatchQuotes(tickers: string[]) {
  return fmpGet<Array<Record<string, unknown>>>(`/quote/${tickers.join(",")}`);
}

/**
 * Dividend history for a single ticker — used in Stage 2 on the (already
 * narrowed) survivor list, not the full universe.
 */
export async function getDividendHistory(ticker: string) {
  return fmpGet<Record<string, unknown>>(`/historical-price-full/stock_dividend/${ticker}`);
}

/**
 * Key financial ratios for a single ticker — used in Stage 2/3 on survivors.
 */
export async function getFinancialRatios(ticker: string) {
  return fmpGet<Array<Record<string, unknown>>>(`/ratios/${ticker}`, { limit: "1" });
}

/**
 * Recent daily price history for a single ticker — used in Stage 3 for
 * key price level checks (support/resistance, moving averages).
 */
export async function getRecentPriceHistory(ticker: string, days = 60) {
  return fmpGet<Record<string, unknown>>(`/historical-price-full/${ticker}`, {
    timeseries: String(days),
  });
}
