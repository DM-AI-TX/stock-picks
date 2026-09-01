export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import { StatStrip } from "@/components/StatStrip";
import { PicksTable } from "@/components/PicksTable";
import { ExDivCalendar } from "@/components/ExDivCalendar";
import { EconCalendar } from "@/components/EconCalendar";

export default async function HomePage() {
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .order("run_date", { ascending: false })
    .order("composite_score", { ascending: false })
    .limit(10);

  const picks = scores ?? [];
  const avgYield = picks.length
    ? picks.reduce((sum, p) => sum + (p.dividend_yield ?? 0), 0) / picks.length
    : 0;

  return (
    <main style={{ padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, background: "var(--gold)", borderRadius: 4 }} />
          <span className="voice" style={{ fontSize: 22, fontWeight: 500 }}>Compound</span>
        </div>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {picks[0]?.run_date ? `Last run ${picks[0].run_date}` : "No runs yet"}
        </span>
      </div>

      {picks.length === 0 ? (
        <p>No picks yet — the pipeline hasn't run, or hasn't written results.</p>
      ) : (
        <>
          <StatStrip
            stats={[
              { label: "Stocks tracked", value: String(picks.length) },
              { label: "Passed today's screen", value: String(picks.length) },
              { label: "Top score", value: picks[0].composite_score.toFixed(2) },
              { label: "Avg dividend yield", value: `${avgYield.toFixed(1)}%` },
            ]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 32 }}>
            <PicksTable picks={picks} />
            <div>
              <ExDivCalendar />
              <EconCalendar />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
