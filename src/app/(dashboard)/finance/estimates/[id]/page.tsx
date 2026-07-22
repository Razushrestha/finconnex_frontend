import { EstimateDetailClient } from "@/components/finance/estimates/EstimateDetailClient";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EstimateDetailClient id={id} />;
}
