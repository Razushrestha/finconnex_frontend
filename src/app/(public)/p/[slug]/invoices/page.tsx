import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalInvoicesPane } from "@/components/portals/public/PortalModulePanes";

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Invoices">
        <PortalInvoicesPane slug={slug} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
