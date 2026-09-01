import { CreateEstimateForm } from "@/components/finance/estimates/CreateEstimateForm";

export default async function CreateEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    relatedId?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  return (
    <CreateEstimateForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
      relatedKind={sp.relatedKind}
      relatedName={sp.relatedName}
      relatedId={sp.relatedId}
      email={sp.to}
    />
  );
}
