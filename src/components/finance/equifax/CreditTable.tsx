import React from "react";
import { ExternalLink, Trash2, FileSearch } from "lucide-react";
import { ScoreBadge, StatusBadge } from "./Badges";

export interface CreditRow {
  fileRef: string;
  applicant: string;
  subLabel?: string;
  inquiryType: string;
  reportDate: string;
  score: number | string;
  band: string;
  status: string;
  isFlagged?: boolean;
}

interface CreditTableProps {
  rows?: CreditRow[];
  onViewReport?: (row: CreditRow) => void;
  onOpenExternal?: (row: CreditRow) => void;
  onDelete?: (row: CreditRow) => void;
  onRowClick?: (row: CreditRow) => void;
}

export default function CreditTable({
  rows = [],
  onViewReport,
  onOpenExternal,
  onDelete,
  onRowClick,
}: CreditTableProps) {
  const targetRowCount = 5;
  const emptyRowsCount = Math.max(0, targetRowCount - rows.length);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-4 py-3 font-medium">FILE REF</th>
            <th className="px-4 py-3 font-medium">APPLICANT / BUSINESS</th>
            <th className="px-4 py-3 font-medium">SCORE &amp; BAND</th>
            <th className="px-4 py-3 font-medium">INQUIRY TYPE</th>
            <th className="px-4 py-3 font-medium">REPORT DATE</th>
            <th className="px-4 py-3 font-medium">VERIFICATION STATUS</th>
            <th className="px-4 py-3 font-medium text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-2">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mb-0.5">
                    No credit check records found
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Run a new credit check using the button above to populate
                    this table.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            <>
              {rows.map((row) => (
                <tr
                  key={row.fileRef}
                  onClick={() => onRowClick?.(row)}
                  className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-4 align-top text-sm font-medium text-violet-600">
                    {row.fileRef}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-slate-900">
                      {row.applicant}
                    </p>
                    {row.subLabel && (
                      <p
                        className={`text-xs ${
                          row.isFlagged ? "text-rose-500" : "text-slate-400"
                        }`}
                      >
                        {row.subLabel}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <ScoreBadge score={row.score} band={row.band} />
                  </td>
                  <td className="px-4 py-4 align-top text-slate-600">
                    {row.inquiryType}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-600">
                    {row.reportDate}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StatusBadge status={row.status} />
                  </td>
                  <td
                    className="px-4 py-4 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewReport?.(row)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          row.status === "High Risk"
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            : "bg-violet-50 text-violet-600 hover:bg-violet-100"
                        }`}
                      >
                        {row.status === "High Risk"
                          ? "Review Flags"
                          : "View Report"}
                      </button>
                      <button
                        onClick={() => onOpenExternal?.(row)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Open externally"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete?.(row)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Render empty placeholder rows to maintain fixed height matching 5 rows */}
              {Array.from({ length: emptyRowsCount }).map((_, index) => (
                <tr
                  key={`empty-${index}`}
                  className="border-b border-slate-50 last:border-0 pointer-events-none"
                >
                  <td
                    colSpan={7}
                    className="px-4 py-4 text-transparent select-none"
                  >
                    &nbsp;
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
