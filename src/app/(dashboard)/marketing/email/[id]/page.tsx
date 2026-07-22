import { EmailCampaignDetailClient } from "@/components/marketing/email/EmailCampaignDetailClient";

export default async function EmailCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailCampaignDetailClient id={id} />;
}
