import { SmsCampaignDetailClient } from "@/components/marketing/sms/SmsCampaignDetailClient";

export default async function SmsCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SmsCampaignDetailClient id={id} />;
}
