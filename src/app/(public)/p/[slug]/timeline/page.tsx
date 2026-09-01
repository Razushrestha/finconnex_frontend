import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalTimelineClient } from "@/components/portals/public/mortgage/PortalTimelineClient";

export default async function PortalTimelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalTimelineClient slug={slug} />
    </PortalShell>
  );
}
