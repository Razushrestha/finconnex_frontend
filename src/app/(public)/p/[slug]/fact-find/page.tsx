import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalFactFindClient } from "@/components/portals/public/mortgage/PortalFactFindClient";

export default async function PortalFactFindPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalFactFindClient slug={slug} />
    </PortalShell>
  );
}
