import { CreateReportForm } from "@/components/reports/CreateReportForm";
import { REPORT_DATA_SOURCES } from "@/lib/reports/catalog";
import { REPORT_TYPES, type ReportType } from "@/lib/reports/types";

export default async function CreateReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    type?: string;
    source?: string;
  }>;
}) {
  const sp = await searchParams;
  const type = REPORT_TYPES.includes(sp.type as ReportType)
    ? (sp.type as ReportType)
    : undefined;
  const source = sp.source && REPORT_DATA_SOURCES.includes(sp.source as (typeof REPORT_DATA_SOURCES)[number])
    ? sp.source
    : undefined;
  return (
    <CreateReportForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
      initialType={type}
      initialSource={source}
    />
  );
}
