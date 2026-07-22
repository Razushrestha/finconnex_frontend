import { CreateEmailCampaignForm } from "@/components/marketing/email/CreateEmailCampaignForm";

export default async function CreateEmailCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateEmailCampaignForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
