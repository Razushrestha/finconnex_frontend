import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import type { SignatureRequest } from "@/lib/documents/signature/types";
import { STATUS_STYLE, StatusBadge } from "./StatusBadge";

export function SignatureRequestsTable({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onRowClick,
}: {
  rows: SignatureRequest[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowClick: (r: SignatureRequest) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              {[
                "Document",
                "Signer",
                "Related To",
                "Status",
                "Sent",
                "Expiry",
                "Created By",
              ].map((label) => (
                <th
                  key={label}
                  className="border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => onRowClick(r)}
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-violet-50/50",
                  i % 2 === 1 && "bg-slate-50/40",
                )}
              >
                <td className="max-w-[240px] border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-8 w-1 shrink-0 rounded-full",
                        STATUS_STYLE[r.status].dot,
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 group-hover:text-violet-700">
                        {r.documentName}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {r.signatureRequestId}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <p className="font-medium text-slate-700">{r.signer}</p>
                  <p className="text-[10px] text-slate-400">{r.signerEmail}</p>
                </td>
                <td className="max-w-[160px] truncate border-b border-slate-100 px-4 py-3 text-slate-500">
                  {r.relatedTo ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-500">
                  {r.sentDate ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-500">
                  {r.expiryDate}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ring-2 ring-white",
                        avatarColor(r.createdBy),
                      )}
                    >
                      {initials(r.createdBy)}
                    </span>
                    <span className="truncate text-slate-700">
                      {r.createdBy}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      No signature requests match
                    </p>
                    <p className="text-[12px] text-slate-400">
                      Try a different status or search term.
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11.5px] text-slate-500">
          <span>
            Showing{" "}
            <span className="font-medium text-slate-700">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-medium text-slate-700">{total}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="px-1 text-slate-400">
              Page <span className="font-medium text-slate-700">{page}</span> of{" "}
              {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
