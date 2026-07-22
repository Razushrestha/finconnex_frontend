import { QuotationDetailClient } from "@/components/finance/quotations/QuotationDetailClient";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotationDetailClient id={id} />;
}
