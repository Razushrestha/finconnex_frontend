import { WhatsAppCampaignDetailClient } from "@/components/marketing/whatsapp/WhatsAppCampaignDetailClient";

export default async function WhatsAppCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WhatsAppCampaignDetailClient id={id} />;
}
