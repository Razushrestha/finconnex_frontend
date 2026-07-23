import { ResourceDetailClient } from "@/components/resources/ResourceDetailClient";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResourceDetailClient id={id} />;
}
