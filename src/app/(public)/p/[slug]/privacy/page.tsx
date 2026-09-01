import { PortalLegalPage } from "@/components/portals/public/mortgage/PortalLegalPage";

export default async function PortalPrivacyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalLegalPage
      slug={slug}
      title="Privacy Policy"
      body={[
        "FinConnex collects and uses your personal information to assess and manage your home loan application, communicate with you, and meet our legal obligations.",
        "We may share information with your broker, lenders, valuers, and service providers where needed to progress your application.",
        "You can ask us for a copy of your information or to correct it. By signing in and accepting this policy, you consent to this handling of your information.",
      ]}
    />
  );
}
