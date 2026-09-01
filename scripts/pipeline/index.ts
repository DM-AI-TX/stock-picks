import { createClient } from "@supabase/supabase-js";
import { runPerformanceFilter } from "./stage1-performance-filter";
import { runDividendFilter } from "./stage2-dividend-filter";
import { runDetailScoring } from "./stage3-detail-scoring";
import { runNotifications } from "./stage4-notify";

/**
 * Entry point for the daily pipeline. Run via `npm run pipeline` locally,
 * or by the GitHub Actions workflow in .github/workflows/daily-pipeline.yml.
 */
async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runDate = new Date().toISOString().slice(0, 10);
  await supabase.from("pipeline_runs").insert({ run_date: runDate, status: "running" });

  try {
    console.log("Stage 1: performance filter...");
    const stage1Results = await runPerformanceFilter();
    console.log(`  -> ${stage1Results.length} stocks survived.`);

    console.log("Stage 2: dividend filter...");
    const stage2Results = await runDividendFilter(stage1Results);
    console.log(`  -> ${stage2Results.length} stocks survived.`);

    console.log("Stage 3: detail scoring...");
    const stage3Results = await runDetailScoring(stage2Results);
    console.log(`  -> Scored ${stage3Results.length} stocks.`);

    // TODO: decide how many "top picks" to store/notify on — top 10? top 5%?
    const topPicks = stage3Results.slice(0, 10);

    console.log("Writing scores to Supabase...");
    const { error: insertError } = await supabase.from("scores").upsert(
      stage3Results.map((s) => ({
        run_date: runDate,
        ticker: s.ticker,
        company_name: s.companyName,
        performance_score: s.performanceScore,
        dividend_yield: s.dividendYield,
        price: s.price,
        payout_ratio: s.payoutRatio,
        price_level_score: s.priceLevelScore,
        composite_score: s.compositeScore,
        details: s.details,
      })),
      { onConflict: "run_date,ticker,algorithm_version" }
    );
    if (insertError) throw insertError;

    console.log("Stage 4: notifications...");
    await runNotifications(topPicks);

    await supabase
      .from("pipeline_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        universe_count: stage1Results.length,
        dividend_filtered_count: stage2Results.length,
        final_picks_count: topPicks.length,
      })
      .eq("run_date", runDate);

    console.log("Pipeline complete.");
  } catch (err) {
    console.error("Pipeline failed:", err);
    await supabase
      .from("pipeline_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("run_date", runDate);
    process.exit(1);
  }
}

main();
