/**
 * HeatmapChart — renders a grid heatmap of detection counts.
 * Uses pure SVG/CSS for zero extra deps.
 */
export default function HeatmapChart({ data = [], height = 200 }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.count || 0), 1)
  const cols = Math.min(data.length, 24)
  const rows = Math.ceil(data.length / cols)

  return (
    <div style={{ height }} className="overflow-auto">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {data.map((cell, i) => {
          const intensity = cell.count / maxVal
          const alpha = 0.1 + intensity * 0.85
          return (
            <div
              key={i}
              className="rounded aspect-square cursor-pointer transition-transform hover:scale-110"
              style={{ background: `rgba(99,102,241,${alpha})` }}
              title={`${cell.label || cell.hour || i}: ${cell.count} detections`}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 0.95].map((a) => (
          <div key={a} className="w-4 h-4 rounded" style={{ background: `rgba(99,102,241,${a})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
