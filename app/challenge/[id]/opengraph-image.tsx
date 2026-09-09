import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import type { ScoredPick } from "@/lib/battle-scoring";
import { isUuid } from "@/lib/battle-record";
import { fallbackPlayerName, playerReferenceKey, readPlayerPresentations } from "@/lib/player-profiles";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const alt = "A head-to-head fantasy-stock challenge on Gauntlet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontPromise = readFile(join(process.cwd(), "public/fonts/GeistPixel-Circle.ttf"));
const logoPromise = readFile(join(process.cwd(), "public/gauntlet-logo-1024.png")).then((data) => `data:image/png;base64,${data.toString("base64")}`);

type ShareBattle = {
  status: "waiting" | "active" | "complete";
  player_picks: ScoredPick[];
  opponent_picks: ScoredPick[] | null;
  duration_minutes: 60 | 1440;
  creator_user_id: string | null;
  creator_guest_hash: string | null;
  opponent_user_id: string | null;
  opponent_guest_hash: string | null;
};

export default async function ChallengeImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [font, logo] = await Promise.all([fontPromise, logoPromise]);
  const battle = await readShareBattle(id);
  const left = battle?.creatorName ?? "CHALLENGER";
  const right = battle?.opponentName ?? "YOUR TEAM";
  const leftPicks = battle?.row.player_picks.map((pick) => pick.ticker) ?? ["NVDAc", "AAPLc", "TSLAc"];
  const rightPicks = battle?.row.opponent_picks?.map((pick) => pick.ticker) ?? ["?", "?", "?"];
  const state = battle?.row.status === "complete" ? "FINAL" : battle?.row.status === "active" ? "LIVE" : "OPEN CHALLENGE";

  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#07080a", color: "#f4f2ee", fontFamily: "Geist Pixel", border: "2px solid #242932" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", opacity: .13, backgroundImage: "radial-gradient(circle at 1px 1px, #f5ff00 1px, transparent 1.2px)", backgroundSize: "7px 7px" }} />
      <div style={{ position: "absolute", left: 464, top: 98, width: 270, height: 430, display: "flex", opacity: .16 }}>
        <img src={logo} alt="" width={270} height={430} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 1px 1px, #07080a 2px, transparent 2.2px)", backgroundSize: "6px 6px" }} />
      </div>
      <div style={{ position: "relative", height: 92, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", borderBottom: "1px solid #242932" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, letterSpacing: ".12em" }}><img src={logo} alt="" width={38} height={38} /> GAUNTLET</div>
        <div style={{ display: "flex", color: "#f5ff00", fontSize: 15, letterSpacing: ".12em" }}>{state} · {battle?.row.duration_minutes === 60 ? "1 HOUR" : "24 HOURS"}</div>
      </div>
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "stretch" }}>
        <Team name={left} picks={leftPicks} side="left" />
        <div style={{ width: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5ff00", fontSize: 72 }}>VS</div>
        <Team name={right} picks={rightPicks} side="right" />
      </div>
      <div style={{ position: "relative", height: 74, display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #242932", color: "#8f959e", fontSize: 15, letterSpacing: ".1em" }}>YOUR TEAM · THEIR TEAM · VERIFIED BASE MARKET DATA</div>
    </div>,
    { ...size, fonts: [{ name: "Geist Pixel", data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, weight: 400, style: "normal" }] },
  );
}

function Team({ name, picks, side }: { name: string; picks: string[]; side: "left" | "right" }) {
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: side === "left" ? "flex-start" : "flex-end", padding: side === "left" ? "30px 0 30px 52px" : "30px 52px 30px 0" }}>
    <div style={{ display: "flex", color: "#777e88", fontSize: 14, letterSpacing: ".14em" }}>TEAM</div>
    <div style={{ display: "flex", maxWidth: 390, marginTop: 10, marginBottom: 30, textAlign: side === "left" ? "left" : "right", fontSize: 38, color: side === "left" ? "#f4f2ee" : "#f5ff00" }}>{name.toLowerCase()}</div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: side === "left" ? "flex-start" : "flex-end", gap: 10 }}>
      {picks.map((ticker, index) => <div key={`${ticker}-${index}`} style={{ width: 330, display: "flex", flexDirection: side === "left" ? "row" : "row-reverse", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", border: "1px solid #2a3039", background: "#0b0d10e8", fontSize: 19 }}><span style={{ color: "#5d6570", fontSize: 13 }}>0{index + 1}</span><span>{ticker}</span></div>)}
    </div>
  </div>;
}

async function readShareBattle(id: string) {
  if (!isUuid(id)) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const result = await supabase.from("battles").select("status,player_picks,opponent_picks,duration_minutes,creator_user_id,creator_guest_hash,opponent_user_id,opponent_guest_hash").eq("id", id).maybeSingle<ShareBattle>();
  if (!result.data) return null;
  const creator = { owner_user_id: result.data.creator_user_id, guest_session_hash: result.data.creator_guest_hash };
  const opponent = { owner_user_id: result.data.opponent_user_id, guest_session_hash: result.data.opponent_guest_hash };
  const profiles = await readPlayerPresentations(supabase, [creator, opponent]);
  return {
    row: result.data,
    creatorName: profiles.get(playerReferenceKey(creator))?.username ?? fallbackPlayerName(creator),
    opponentName: result.data.opponent_user_id || result.data.opponent_guest_hash ? profiles.get(playerReferenceKey(opponent))?.username ?? fallbackPlayerName(opponent) : "YOUR TEAM",
  };
}
