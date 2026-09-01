// TODO: this is placeholder data. Wire up to a real ex-dividend date data
// source once that's built into the pipeline (Stage 2).
const PLACEHOLDER_EX_DIV_DAYS = [
  { date: "Sep 2", tickers: ["CAT", "JNJ"] },
  { date: "Sep 4", tickers: ["KO"] },
  { date: "Sep 8", tickers: ["PG", "CL", "KMB"] },
  { date: "Sep 11", tickers: ["XOM"] },
  { date: "Sep 13", tickers: ["MMM"] },
];

export function ExDivCalendar() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Upcoming ex-dividend</div>
      <div className="panel">
        {PLACEHOLDER_EX_DIV_DAYS.map((d) => (
          <div key={d.date} className="panel-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: 13, color: "var(--text-muted)" }}>{d.date}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {d.tickers.map((t) => (
                <span
                  key={t}
                  className="mono"
                  style={{ fontSize: 12, background: "#1F2329", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 7px" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
