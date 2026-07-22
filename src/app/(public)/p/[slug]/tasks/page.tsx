import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalTasksPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalTasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Tasks">
        <PortalTasksPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
