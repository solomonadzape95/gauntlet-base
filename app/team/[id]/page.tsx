import { PublicTeam } from "@/components/public-team";

export default async function PublicTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicTeam entryId={id} />;
}
