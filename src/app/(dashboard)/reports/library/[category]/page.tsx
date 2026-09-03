import { CategoryReports } from "@/components/reports/library/CategoryReports";

export default async function ReportCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <CategoryReports categoryId={category} />;
}
