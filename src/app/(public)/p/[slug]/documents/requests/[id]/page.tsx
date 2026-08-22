import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalModuleGuard } from "@/components/portals/public/PortalModuleGuard";
import { PortalDocumentRequestClient } from "@/components/portals/public/PortalDocumentRequestClient";

export default async function PortalDocumentRequestPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalModuleGuard slug={slug} module="Documents">
        <PortalDocumentRequestClient slug={slug} requestId={id} />
      </PortalModuleGuard>
    </PortalShell>
  );
}
