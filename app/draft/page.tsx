import { DraftBuilder } from "@/components/draft-builder";

export default async function DraftPage({ searchParams }: { searchParams: Promise<{ own?: string }> }) {
  const { own } = await searchParams;
  return <div className="shell page-shell"><DraftBuilder ownDraftId={own} /></div>;
}
