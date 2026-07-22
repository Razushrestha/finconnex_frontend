import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalDealsPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalDealsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Deals">
        <PortalDealsPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
