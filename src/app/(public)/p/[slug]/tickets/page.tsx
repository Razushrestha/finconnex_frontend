import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalTicketsPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalTicketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Tickets">
        <PortalTicketsPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
