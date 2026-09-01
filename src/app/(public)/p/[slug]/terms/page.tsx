import { PortalLegalPage } from "@/components/portals/public/mortgage/PortalLegalPage";

export default async function PortalTermsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PortalLegalPage
      slug={slug}
      title="Terms and Conditions"
      body={[
        "This client portal is provided so you can complete your fact find, upload documents, and communicate with your broker.",
        "You must keep your sign-in code confidential and only use the portal for your own application. Information shown here, including loan figures, is indicative unless we say otherwise.",
        "By accepting these terms you agree to use the portal in good faith and understand that a formal credit offer is made only by a lender.",
      ]}
    />
  );
}
