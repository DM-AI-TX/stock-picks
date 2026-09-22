/**
 * Twelve Data historical daily price/volume, used to compute average
 * dollar volume for the liquidity hard filter (20/30-day avg >= $10M).
 *
 * Free tier: 8 requests/minute, 800/day. Throttled at ~7.7s between calls
 * to stay safely under the per-minute cap across a run of ~70-80 symbols
 * (expect this step alone to take ~9-10 minutes -- fine for a weekly cron).
 */

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com/time_series";
const THROTTLE_MS = 7700;
const LIQUIDITY_THRESHOLD = 10_000_000; // $10M

function requireApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    throw new Error("TWELVE_DATA_API_KEY is not set in the environment.");
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TwelveDataDailyBar {
  datetime: string;
  close: string;
  volume: string;
}

interface TwelveDataTimeSeriesResponse {
  values?: TwelveDataDailyBar[];
  status?: string;
  message?: string;
}

export interface LiquidityResult {
  symbol: string;
  avgDollarVolume20d: number | null;
  avgDollarVolume30d: number | null;
  passesLiquidityFilter: boolean;
}

/**
 * Fetch the last `outputsize` daily bars and compute average dollar
 * volume (close * volume) over the trailing 20 and 30 sessions. Fails
 * soft -- returns nulls / false rather than throwing.
 */
export async function getLiquidity(symbol: string, outputsize = 30): Promise<LiquidityResult> {
  const apiKey = requireApiKey();
  const url = new URL(TWELVE_DATA_BASE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url.toString());
    const json = (await res.json()) as TwelveDataTimeSeriesResponse;

    if (!res.ok || json.status === "error" || !Array.isArray(json.values)) {
      return { symbol, avgDollarVolume20d: null, avgDollarVolume30d: null, passesLiquidityFilter: false };
    }

    // Twelve Data returns most-recent-first.
    const bars = json.values;
    const dollarVolumes = bars.map((b) => Number(b.close) * Number(b.volume)).filter((n) => !isNaN(n));

    const avg = (n: number) =>
      dollarVolumes.length >= n ? dollarVolumes.slice(0, n).reduce((a, b) => a + b, 0) / n : null;

    const avg20 = avg(20);
    const avg30 = avg(30);
    const bestAvg = avg20 ?? avg30;

    return {
      symbol,
      avgDollarVolume20d: avg20,
      avgDollarVolume30d: avg30,
      passesLiquidityFilter: bestAvg !== null && bestAvg >= LIQUIDITY_THRESHOLD,
    };
  } catch {
    return { symbol, avgDollarVolume20d: null, avgDollarVolume30d: null, passesLiquidityFilter: false };
  }
}

export async function getLiquidityForUniverse(symbols: string[]): Promise<LiquidityResult[]> {
  const results: LiquidityResult[] = [];
  for (const symbol of symbols) {
    results.push(await getLiquidity(symbol));
    await sleep(THROTTLE_MS);
  }
  return results;
}
