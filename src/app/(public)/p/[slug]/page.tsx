import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalHomeClient } from "@/components/portals/public/PortalHomeClient";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalHomeClient slug={slug} />
    </PortalShell>
  );
}
