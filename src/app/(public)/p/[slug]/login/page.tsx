import { PortalLoginClient } from "@/components/portals/public/PortalLoginClient";

export default async function PortalLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PortalLoginClient slug={slug} />;
}
