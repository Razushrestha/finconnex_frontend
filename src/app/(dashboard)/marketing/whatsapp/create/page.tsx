import { CreateWhatsAppCampaignForm } from "@/components/marketing/whatsapp/CreateWhatsAppCampaignForm";

export default async function CreateWhatsAppCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateWhatsAppCampaignForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
