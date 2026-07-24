import { PublicJourneyClient } from "@/components/finance/journey/PublicJourneyClient";

export default async function PublicJourneyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicJourneyClient token={token} />;
}
