import { reportById } from "@/lib/reports/library/catalog";
import { runActivityReport, runDocumentReport } from "@/lib/reports/library/compute/ops";
import { runFinanceReport, runMarketingReport } from "@/lib/reports/library/compute/commercial";
import { runDealsReport, runPipelineReport } from "@/lib/reports/library/compute/deals";
import { runLeadsReport } from "@/lib/reports/library/compute/leads";
import { runContactReport, runExecutiveReport, runTeamReport } from "@/lib/reports/library/compute/people";
import type { LibraryFilters, ReportResult } from "@/lib/reports/library/types";

export function runLibraryReport(
  reportId: string,
  filters: LibraryFilters,
  now = new Date(),
): ReportResult {
  const def = reportById(reportId);
  if (!def) {
    return { kpis: [], rows: [], emptyReason: "This report is not in the library." };
  }

  const runner = {
    leads: runLeadsReport,
    deals: runDealsReport,
    pipeline: runPipelineReport,
    activity: runActivityReport,
    documents: runDocumentReport,
    marketing: runMarketingReport,
    finance: runFinanceReport,
    team: runTeamReport,
    contacts: runContactReport,
    executive: runExecutiveReport,
  }[def.category];

  const result = runner(reportId, filters, now);
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    return {
      ...result,
      rows: result.rows.filter((row) =>
        Object.values(row.cells).some((cell) => String(cell ?? "").toLowerCase().includes(q)),
      ),
    };
  }
  return result;
}
