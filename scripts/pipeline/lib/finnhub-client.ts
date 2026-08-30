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
