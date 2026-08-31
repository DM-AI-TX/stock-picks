export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";

// TODO: this is a bare-bones placeholder. Build out real UI — watchlists,
// auth, notification preferences, earnings/ex-div calendar — from here.
export default async function HomePage() {
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .order("run_date", { ascending: false })
    .order("composite_score", { ascending: false })
    .limit(10);

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Today&apos;s Top Picks</h1>
      {!scores || scores.length === 0 ? (
        <p>No picks yet — the pipeline hasn&apos;t run, or hasn&apos;t written results.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th>Dividend Yield</th>
              <th>Composite Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={`${s.run_date}-${s.ticker}`}>
                <td>{s.ticker}</td>
                <td>{s.company_name}</td>
                <td>{s.dividend_yield}%</td>
                <td>{Number(s.composite_score).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
