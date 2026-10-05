"use client";

import { ReportsLibrary } from "@/components/reports/library/ReportsLibrary";
import { useCrmReports } from "@/lib/reports/use-crm-reports";

export default function ReportsPage() {
  useCrmReports();
  return <ReportsLibrary />;
}
