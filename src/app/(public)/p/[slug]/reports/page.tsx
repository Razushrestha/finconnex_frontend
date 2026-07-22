import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalReportsPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Reports">
        <PortalReportsPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
