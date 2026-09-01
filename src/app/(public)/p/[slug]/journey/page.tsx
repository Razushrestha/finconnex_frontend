import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalJourneyClient } from "@/components/portals/public/mortgage/PortalJourneyClient";

export default async function PortalJourneyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalJourneyClient slug={slug} />
    </PortalShell>
  );
}
