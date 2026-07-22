import { PaymentDetailClient } from "@/components/finance/payments/PaymentDetailClient";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentDetailClient id={id} />;
}
