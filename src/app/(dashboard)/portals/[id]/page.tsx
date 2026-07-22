import { PortalDetailClient } from "@/components/portals/PortalDetailClient";

export default async function PortalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortalDetailClient id={id} />;
}
