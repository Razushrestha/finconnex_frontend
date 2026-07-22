import { CreateInvoiceForm } from "@/components/finance/invoices/CreateInvoiceForm";

export default async function CreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateInvoiceForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
