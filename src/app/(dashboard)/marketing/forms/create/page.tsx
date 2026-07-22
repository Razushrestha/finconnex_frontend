import { CreateMarketingFormForm } from "@/components/marketing/forms/CreateMarketingFormForm";

export default async function CreateFormPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateMarketingFormForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
