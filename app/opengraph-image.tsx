import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Gauntlet — Draft, battle, and optionally own tokenized stocks on Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const geistPixelFontPromise = readFile(join(process.cwd(), "public/fonts/GeistPixel-Circle.ttf"));
const logoDataUriPromise = readFile(join(process.cwd(), "public/gauntlet-logo-1024.png")).then((data) => `data:image/png;base64,${data.toString("base64")}`);

export default async function OpenGraphImage() {
  const font = await geistPixelFontPromise;
  const logo = await logoDataUriPromise;

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: "48px 54px", background: "#07080a", color: "#f4f2ee", fontFamily: "Geist Pixel", border: "2px solid #242932" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", opacity: .14, backgroundImage: "radial-gradient(circle at 1px 1px, #f5ff00 1px, transparent 1.2px)", backgroundSize: "7px 7px" }} />
      <div style={{ position: "absolute", top: 84, right: -95, width: 570, height: 570, display: "flex", opacity: .22 }}>
        <img src={logo} alt="" width={570} height={570} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", opacity: .62, backgroundImage: "radial-gradient(circle at 1px 1px, #07080a 2px, transparent 2.2px)", backgroundSize: "6px 6px" }} />
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 23, letterSpacing: "0.12em" }}>
          <img src={logo} alt="" width={42} height={42} style={{ objectFit: "contain" }} />
          GAUNTLET
        </div>
        <div style={{ display: "flex", padding: "12px 16px", border: "1px solid #f5ff00", color: "#f5ff00", fontSize: 15, letterSpacing: "0.12em" }}>LIVE ON BASE</div>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: 850 }}>
        <div style={{ display: "flex", color: "#f5ff00", fontSize: 17, letterSpacing: "0.16em", marginBottom: 22 }}>FANTASY STOCKS · REAL MARKET DATA</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 86, lineHeight: .9, letterSpacing: "-0.045em" }}>
          <span>DRAFT. BATTLE.</span>
          <span style={{ color: "#f5ff00" }}>OWN A LITTLE.</span>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", background: "#07080add", borderTop: "1px solid #242932", borderBottom: "1px solid #242932" }}>
        {[["03–05", "STOCK PICKS"], ["24H", "HEAD TO HEAD"], ["B20", "SELF-CUSTODY"]].map(([value, label], index) => (
          <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", padding: "20px 24px", borderLeft: index ? "1px solid #242932" : "none" }}>
            <span style={{ color: "#f5ff00", fontSize: 28 }}>{value}</span>
            <span style={{ color: "#858b95", fontSize: 13, letterSpacing: "0.1em" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>,
    { ...size, fonts: [{ name: "Geist Pixel", data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 400, style: "normal" }] },
  );
}
