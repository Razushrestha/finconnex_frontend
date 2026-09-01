import { PublicSalesDocumentClient } from "@/components/finance/public-sales/PublicSalesDocumentClient";

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ id: string; hash: string }>;
}) {
  const { id, hash } = await params;
  return <PublicSalesDocumentClient kind="estimates" id={id} hash={hash} />;
}
