import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalProfileClient } from "@/components/portals/public/mortgage/PortalProfileClient";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalProfileClient slug={slug} />
    </PortalShell>
  );
}
