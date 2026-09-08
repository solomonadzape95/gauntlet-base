import { DraftBuilder } from "@/components/draft-builder";

export default async function DraftPage({ searchParams }: { searchParams: Promise<{ own?: string; returnTo?: string }> }) {
  const { own, returnTo } = await searchParams;
  const safeReturnTo = returnTo === "/battle" || returnTo === "/leaderboard" || returnTo?.startsWith("/battle/") ? returnTo : undefined;
  return <div className="shell page-shell"><DraftBuilder ownDraftId={own} returnTo={safeReturnTo} /></div>;
}
