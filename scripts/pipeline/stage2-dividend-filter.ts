import type { PerformanceFiltered, DividendFiltered } from "./lib/types";

/**
 * Stage 2: dividend quality/frequency filter -- TEMPORARILY SIMPLIFIED.
 *
 * Placeholder pass-through while Phase B (dividend frequency detection,
 * quality/financial health checks) gets built. Does NOT yet filter
 * anything out.
 */
export async function runDividendFilter(
  candidates: PerformanceFiltered[]
): Promise<DividendFiltered[]> {
  return candidates.map((stock) => ({
    ...stock,
    dividendYield: 0, // placeholder -- real yield/frequency logic comes later
    payoutRatio: 0,
  }));
}
