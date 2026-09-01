import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalMortgageDocumentsClient } from "@/components/portals/public/mortgage/PortalMortgageDocumentsClient";

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalMortgageDocumentsClient slug={slug} />
    </PortalShell>
  );
}
