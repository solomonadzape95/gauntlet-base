import { ImageResponse } from "next/og";

export const alt = "Gauntlet — Draft, battle, and optionally own tokenized stocks on Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "54px", background: "#070705", color: "#f4f2ee", fontFamily: "Arial, sans-serif", border: "2px solid #292925" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 24, fontWeight: 700, letterSpacing: "0.12em" }}>
          <div style={{ width: 22, height: 22, display: "flex", background: "#f5ff00" }} />
          GAUNTLET
        </div>
        <div style={{ display: "flex", padding: "12px 16px", border: "1px solid #f5ff00", color: "#f5ff00", fontSize: 16, letterSpacing: "0.12em" }}>LIVE ON BASE</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", color: "#f0a868", fontSize: 18, letterSpacing: "0.16em", marginBottom: 20 }}>FANTASY STOCKS · REAL MARKET DATA</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 0.88, fontWeight: 800, letterSpacing: "-0.055em" }}>
          <span>DRAFT. BATTLE.</span>
          <span style={{ color: "#f5ff00" }}>OWN A LITTLE.</span>
        </div>
      </div>

      <div style={{ display: "flex", borderTop: "1px solid #292925", borderBottom: "1px solid #292925" }}>
        {[["03–05", "STOCK PICKS"], ["24H", "HEAD TO HEAD"], ["B20", "SELF-CUSTODY"]].map(([value, label], index) => (
          <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", padding: "22px 24px", borderLeft: index ? "1px solid #292925" : "none" }}>
            <span style={{ color: "#f5ff00", fontSize: 29, fontWeight: 700 }}>{value}</span>
            <span style={{ color: "#85857e", fontSize: 14, letterSpacing: "0.1em" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
