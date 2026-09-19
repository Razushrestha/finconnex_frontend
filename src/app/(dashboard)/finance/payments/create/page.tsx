import { redirect } from "next/navigation";

export default async function CreatePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ create: "1" });
  if (sp.invoiceId) qs.set("invoiceId", sp.invoiceId);
  redirect(`/finance/payments?${qs.toString()}`);
}
