type Point = { points: number };

export function PerformanceSparkline({ history, label }: { history: Point[]; label: string }) {
  if (history.length < 2) return <span className="performance-sparkline empty" aria-label={`${label}: history pending`} />;
  const width = 96;
  const height = 28;
  const values = history.map((point) => point.points);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = Math.max(1, high - low);
  const path = history.map((point, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - ((point.points - low) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const rising = values.at(-1)! >= values[0];
  return <svg className={`performance-sparkline ${rising ? "up" : "down"}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${rising ? "up" : "down"} over the recorded period`} preserveAspectRatio="none"><polyline points={path} /></svg>;
}
