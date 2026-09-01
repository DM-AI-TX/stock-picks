interface Pick {
  ticker: string;
  company_name: string | null;
  price: number | null;
  dividend_yield: number | null;
  composite_score: number;
}

export function PicksTable({ picks }: { picks: Pick[] }) {
  const maxScore = Math.max(...picks.map((p) => p.composite_score), 1);

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Today's top picks</div>
      <div className="panel" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Ticker", "Company", "Price", "Yield", "Score"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i < 2 ? "left" : "right",
                    fontSize: 12,
                    fontWeight: 400,
                    color: "var(--text-muted)",
                    padding: "10px 16px",
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
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{p.ticker}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 13 }}>
                  {p.company_name}
                </td>
                <td className="mono" style={{ padding: "12px 16px", textAlign: "right" }}>
                  {p.price != null ? `$${p.price.toFixed(2)}` : "—"}
                </td>
                <td className="mono" style={{ padding: "12px 16px", textAlign: "right", color: "var(--green)" }}>
                  {p.dividend_yield != null ? `${p.dividend_yield.toFixed(1)}%` : "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
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
