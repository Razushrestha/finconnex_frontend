import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalResourcesIndex } from "@/components/portals/public/mortgage/PortalResourcesClient";

export default async function PortalResourcesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalResourcesIndex slug={slug} />
    </PortalShell>
  );
}
