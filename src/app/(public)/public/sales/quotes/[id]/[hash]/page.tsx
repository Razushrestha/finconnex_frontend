import { PublicSalesDocumentClient } from "@/components/finance/public-sales/PublicSalesDocumentClient";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ id: string; hash: string }>;
}) {
  const { id, hash } = await params;
  return <PublicSalesDocumentClient kind="quotes" id={id} hash={hash} />;
}
