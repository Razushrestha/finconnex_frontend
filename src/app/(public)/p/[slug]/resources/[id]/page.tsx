import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalResourceDetailClient } from "@/components/portals/public/mortgage/PortalResourcesClient";

export default async function PortalResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalResourceDetailClient slug={slug} id={id} />
    </PortalShell>
  );
}
