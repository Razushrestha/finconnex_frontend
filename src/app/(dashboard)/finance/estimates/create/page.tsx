import { CreateEstimateForm } from "@/components/finance/estimates/CreateEstimateForm";

export default async function CreateEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateEstimateForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
