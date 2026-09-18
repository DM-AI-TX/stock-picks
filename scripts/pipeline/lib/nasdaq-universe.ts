/**
 * Pulls the full list of NYSE + NASDAQ common stocks from NASDAQ Trader's
 * free, public symbol directory files. No API key needed, no rate limit --
 * this is a plain text file NASDAQ publishes for exactly this purpose.
 *
 * nasdaqlisted.txt -- securities listed on NASDAQ itself
 * otherlisted.txt -- securities listed on NYSE and other exchanges
 */

const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";

export interface UniverseTicker {
  symbol: string;
  name: string;
  exchange: "NASDAQ" | "NYSE" | "OTHER";
}

// Security-name patterns that mean "not a plain common stock" -- warrants,
// units, rights, preferred shares, ETNs, etc. These files don't have a
// clean single flag for this, so we filter on the name itself. This is a
// best-effort heuristic -- expect to refine it as real output surfaces
// edge cases.
const NON_COMMON_STOCK_PATTERNS = [
  /warrant/i,
  /\bunit(s)?\b/i,
  /\bright(s)?\b/i,
  /preferred/i,
  /depositary/i,
  /\bnotes?\b/i,
  /\bwhen issued\b/i,
  /\bETNs?\b/i,
];

function isLikelyCommonStock(name: string): boolean {
  return !NON_COMMON_STOCK_PATTERNS.some((pattern) => pattern.test(name));
}

async function fetchAndParse(url: string, exchange: UniverseTicker["exchange"]): Promise<UniverseTicker[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const text = await res.text();
  const lines = text.split("\n").filter(Boolean);

  // First line is a header; last line is often a file-generation timestamp
  // footer starting with "File Creation Time" -- skip both.
  const rows = lines.slice(1).filter((line) => !line.startsWith("File Creation Time"));

  const tickers: UniverseTicker[] = [];

  for (const row of rows) {
    const cols = row.split("|");
    // nasdaqlisted.txt: Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
    // otherlisted.txt:  ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
    const symbol = cols[0]?.trim();
    const name = cols[1]?.trim();
    if (!symbol || !name) continue;

    const isEtf = exchange === "NASDAQ" ? cols[6]?.trim() === "Y" : cols[4]?.trim() === "Y";
    const isTestIssue = exchange === "NASDAQ" ? cols[3]?.trim() === "Y" : cols[6]?.trim() === "Y";

    if (isEtf || isTestIssue) continue;
    if (!isLikelyCommonStock(name)) continue;
    if (symbol.includes(".") || symbol.includes("$")) continue; // skip odd-lot/unit-class symbols

    tickers.push({ symbol, name, exchange });
  }

  return tickers;
}

/**
 * Get the full NYSE + NASDAQ common-stock universe, deduplicated.
 */
export async function getFullUniverse(): Promise<UniverseTicker[]> {
  const [nasdaq, other] = await Promise.all([
    fetchAndParse(NASDAQ_LISTED_URL, "NASDAQ"),
    fetchAndParse(OTHER_LISTED_URL, "NYSE"),
  ]);

  const seen = new Set<string>();
  const combined: UniverseTicker[] = [];
  for (const t of [...nasdaq, ...other]) {
    if (seen.has(t.symbol)) continue;
    seen.add(t.symbol);
    combined.push(t);
  }

  return combined;
}
