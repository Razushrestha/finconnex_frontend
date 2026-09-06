import { ReportWorkspace } from "@/components/reports/library/ReportWorkspace";

export default async function LibraryReportPage({
  params,
}: {
  params: Promise<{ category: string; reportId: string }>;
}) {
  const { category, reportId } = await params;
  return <ReportWorkspace categoryId={category} reportId={reportId} />;
}
