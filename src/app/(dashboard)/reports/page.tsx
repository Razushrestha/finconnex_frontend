"use client";

import { ReportsLibrary } from "@/components/reports/library/ReportsLibrary";
import { useCrmReports } from "@/lib/reports/use-crm-reports";

export default function ReportsPage() {
  const crm = useCrmReports();
  return <ReportsLibrary crmSource={crm.source} crmLoading={crm.loading} />;
}
