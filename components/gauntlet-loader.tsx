export function GauntletLoader({ label = "LOADING" }: { label?: string }) {
  return <div className="loading-screen" role="status"><span className="gauntlet-loader" aria-hidden /><span>{label}</span></div>;
}
