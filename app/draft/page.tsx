import { TeamRoom } from "@/components/team-room";

export default async function DraftPage({ searchParams }: { searchParams: Promise<{ own?: string; returnTo?: string; preview?: string }> }) {
  const { own, returnTo, preview } = await searchParams;
  const safeReturnTo = returnTo === "/battle" || returnTo === "/leaderboard" || returnTo?.startsWith("/battle/") ? returnTo : undefined;
  return <div className="shell page-shell"><TeamRoom ownDraftId={own} returnTo={safeReturnTo} preview={process.env.NODE_ENV !== "production" && preview === "team"} /></div>;
}
