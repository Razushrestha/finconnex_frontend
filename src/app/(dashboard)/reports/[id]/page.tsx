import { ReportDetailClient } from "@/components/reports/ReportDetailClient";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportDetailClient id={id} />;
}
