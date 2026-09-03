import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";

export default async function AnalyticsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <AnalyticsSection sectionId={section} />;
}
