// TODO: this is placeholder data. A real free data source for economic
// calendar events still needs to be researched before wiring this up.
const PLACEHOLDER_EVENTS = [
  { date: "Sep 1", event: "ISM Manufacturing PMI" },
  { date: "Sep 4", event: "Jobs Report (NFP)" },
  { date: "Sep 4", event: "Unemployment Rate" },
  { date: "Sep 10", event: "PPI (Aug)" },
  { date: "Sep 11", event: "CPI (Aug)" },
  { date: "Sep 17", event: "Fed Rate Decision" },
];

export function EconCalendar() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, margin: "28px 0 14px" }}>Economic calendar</div>
      <div className="panel">
        {PLACEHOLDER_EVENTS.map((e, i) => (
          <div key={`${e.date}-${i}`} className="panel-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)", width: 42, flexShrink: 0 }}>{e.date}</span>
            <span style={{ fontSize: 13 }}>{e.event}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>High-impact US events only</div>
    </div>
  );
}
