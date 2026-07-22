import { CreateLeadForm } from "@/components/sales/leads/CreateLeadForm";

interface CreateLeadPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateLeadPage({
  searchParams,
}: CreateLeadPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateLeadForm layoutId={layoutId} redirect={redirect} />;
}
