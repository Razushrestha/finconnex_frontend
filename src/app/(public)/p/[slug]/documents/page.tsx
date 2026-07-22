import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalDocumentsPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Documents">
        <PortalDocumentsPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
