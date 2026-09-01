interface Pick {
  ticker: string;
  company_name: string | null;
  dividend_yield: number | null;
  composite_score: number;
  // TODO: none of these are in the database yet — added here as placeholders
  // so the table shape is right. Each needs real data wired up later:
  // sector -> Finnhub /stock/profile2, upcoming_ex_div -> the real ex-div
  // logic (Stage 2 rebuild), avg_volume_10d -> a volume/history endpoint,
  // upcoming_earnings -> an earnings calendar endpoint.
  sector?: string | null;
  upcoming_ex_div?: string | null;
  avg_volume_10d?: number | null;
  upcoming_earnings?: string | null;
}

function purchaseDateFromExDiv(exDiv: string | null | undefined): string {
  if (!exDiv) return "—";
  const d = new Date(exDiv);
  if (isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() - 8);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PicksTable({ picks }: { picks: Pick[] }) {
  const maxScore = Math.max(...picks.map((p) => p.composite_score), 1);
  const columns = [
    "Ticker",
    "Company",
    "Sector",
    "Yield",
    "Upcoming Ex-Div",
    "Purchase Date",
    "Avg Vol (10D)",
    "Upcoming Earnings",
    "Score",
  ];

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Today's Top Picks</div>
      <div className="panel" style={{ overflow: "auto" }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {columns.map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i < 3 ? "left" : "right",
                    fontSize: 12,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                    padding: "10px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {picks.map((p, i) => (
              <tr
                key={p.ticker}
                className="pickrow"
                style={{ borderBottom: i < picks.length - 1 ? "1px solid var(--border-soft)" : "none" }}
              >
                <td style={{ padding: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>{p.ticker}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                  {p.company_name}
                </td>
                <td style={{ padding: "12px", color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>
                  {p.sector ?? "—"}
                </td>
                <td className="mono" style={{ padding: "12px", textAlign: "right", color: "var(--green)", whiteSpace: "nowrap" }}>
                  {p.dividend_yield != null ? `${p.dividend_yield.toFixed(1)}%` : "—"}
                </td>
                <td className="mono" style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {p.upcoming_ex_div ?? "—"}
                </td>
                <td className="mono" style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {purchaseDateFromExDiv(p.upcoming_ex_div)}
                </td>
                <td className="mono" style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {p.avg_volume_10d != null ? p.avg_volume_10d.toLocaleString() : "—"}
                </td>
                <td className="mono" style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {p.upcoming_earnings ?? "—"}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${(p.composite_score / maxScore) * 100}%`,
                          height: "100%",
                          background: "var(--gold)",
                        }}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 13, minWidth: 32 }}>
                      {p.composite_score.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
