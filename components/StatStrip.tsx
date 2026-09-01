export function StatStrip({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 1,
        background: "var(--border)",
        marginBottom: 32,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ background: "var(--panel)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
