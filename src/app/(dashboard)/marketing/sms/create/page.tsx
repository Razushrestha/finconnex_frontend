import { CreateSmsCampaignForm } from "@/components/marketing/sms/CreateSmsCampaignForm";

export default async function CreateSmsCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateSmsCampaignForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
