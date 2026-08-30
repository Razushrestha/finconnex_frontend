import { PublicSalesDocumentClient } from "@/components/finance/public-sales/PublicSalesDocumentClient";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string; hash: string }>;
}) {
  const { id, hash } = await params;
  return <PublicSalesDocumentClient kind="invoices" id={id} hash={hash} />;
}
