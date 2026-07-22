import { CreateQuotationForm } from "@/components/finance/quotations/CreateQuotationForm";

export default async function CreateQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateQuotationForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
