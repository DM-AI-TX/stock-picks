const MARKET_HOLIDAYS = [
  { date: "Sep 7", name: "Labor Day" },
  { date: "Nov 26", name: "Thanksgiving" },
  { date: "Dec 25", name: "Christmas" },
  { date: "Jan 1", name: "New Year's Day" },
];

export function MarketHolidays() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, margin: "28px 0 14px" }}>Market Holidays</div>
      <div className="panel">
        {MARKET_HOLIDAYS.map((h, i) => (
          <div
            key={h.date}
            className="panel-row"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              className="mono"
              style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 46, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {h.date}
            </span>
            <span style={{ fontSize: 13 }}>{h.name}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
        US Markets Closed
      </div>
    </div>
  );
}
