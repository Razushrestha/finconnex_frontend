import { TimeEntryDetailClient } from "@/components/time-tracking/TimeEntryDetailClient";

export default async function TimeEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TimeEntryDetailClient id={id} />;
}
