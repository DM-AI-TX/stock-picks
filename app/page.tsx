export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { StatStrip } from "@/components/StatStrip";
import { PicksTable } from "@/components/PicksTable";
import { EconCalendar } from "@/components/EconCalendar";
import { MarketHolidays } from "@/components/MarketHolidays";

export default async function HomePage() {
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .order("run_date", { ascending: false })
    .order("composite_score", { ascending: false });

  const allRows = scores ?? [];
  const latestDate = allRows[0]?.run_date;
  const picks = latestDate ? allRows.filter((r) => r.run_date === latestDate) : [];
  const topPicks = picks.slice(0, 10);
  const avgYield = picks.length
    ? picks.reduce((sum, p) => sum + (p.dividend_yield ?? 0), 0) / picks.length
    : 0;

  return (
    <main style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src="/logo.png" alt="TradeVaya" style={{ height: 84, width: "auto" }} />
          <div>
            <div className="voice" style={{ fontSize: 52, fontWeight: 500, lineHeight: 1.1 }}>
              TradeVaya
            </div>
            <div className="voice" style={{ fontSize: 14, color: "var(--text-muted)", fontStyle: "italic" }}>
              Refine Your Edge. Devour The Markets.
            </div>
          </div>
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {latestDate ? `Last Run ${latestDate}` : "No Runs Yet"}
        </span>
      </div>

      {picks.length === 0 ? (
        <p>No picks yet — the pipeline hasn't run, or hasn't written results.</p>
      ) : (
        <>
          <StatStrip
            stats={[
              { label: "Stocks Tracked", value: String(picks.length) },
              { label: "Passed Today's Screen", value: String(picks.length) },
              { label: "Top Score", value: picks[0].composite_score.toFixed(2) },
              { label: "Avg Dividend Yield", value: `${avgYield.toFixed(1)}%` },
            ]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 32 }}>
            <PicksTable picks={topPicks} />
            <div>
              <EconCalendar />
              <MarketHolidays />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
