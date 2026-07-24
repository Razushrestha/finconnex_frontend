import { JourneyDetailClient } from "@/components/journeys/JourneyDetailClient";

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JourneyDetailClient id={id} />;
}
