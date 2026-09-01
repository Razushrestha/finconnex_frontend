import { CreateInvoiceForm } from "@/components/finance/invoices/CreateInvoiceForm";

export default async function CreateInvoicePage({
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
    <CreateInvoiceForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
      relatedKind={sp.relatedKind}
      relatedName={sp.relatedName}
      relatedId={sp.relatedId}
      email={sp.to}
    />
  );
}
