import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import { getSession } from "@/lib/auth/session";

export default async function AnalyticsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const session = await getSession();
  return <AnalyticsSection sectionId={section} sessionName={session?.name ?? ""} />;
}
