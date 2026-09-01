import { PortalShell } from "@/components/portals/public/PortalShell";
import { PortalLoanClient } from "@/components/portals/public/mortgage/PortalLoanClient";

export default async function PortalLoanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalShell slug={slug}>
      <PortalLoanClient slug={slug} />
    </PortalShell>
  );
}
