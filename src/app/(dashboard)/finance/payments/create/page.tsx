import { CreatePaymentForm } from "@/components/finance/payments/CreatePaymentForm";

export default async function CreatePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreatePaymentForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
