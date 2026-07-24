import { CreateLeadForm } from "@/components/sales/leads/CreateLeadForm";

interface CreateLeadPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    stage?: string;
  }>;
}

export default async function CreateLeadPage({
  searchParams,
}: CreateLeadPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";
  const stage = params.stage?.trim() || undefined;

  return (
    <CreateLeadForm layoutId={layoutId} redirect={redirect} stage={stage} />
  );
}
