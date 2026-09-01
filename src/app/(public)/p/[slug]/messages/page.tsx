import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalMessagesClient } from "@/components/portals/public/mortgage/PortalMessagesClient";

export default async function PortalMessagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalMessagesClient slug={slug} />
    </PortalShell>
  );
}
