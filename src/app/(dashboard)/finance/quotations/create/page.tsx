import { CreateQuotationForm } from "@/components/finance/quotations/CreateQuotationForm";

export default async function CreateQuotationPage({
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
    <CreateQuotationForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
      relatedKind={sp.relatedKind}
      relatedName={sp.relatedName}
      relatedId={sp.relatedId}
      email={sp.to}
    />
  );
}
