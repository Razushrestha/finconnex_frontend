"use client";

import React, { useState } from "react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Tooltip } from "@/components/ui/tooltip";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Agreement {
  id: string;
  title: string;
  client: string;
  desc: string;
  cycle: string;
  tier: string;
  dates: string;
  status: string;
  value: string;
}

interface AgreementTableProps {
  data: Agreement[];
  onEdit?: (agreement: Agreement) => void;
  onDownload?: (agreementId: string) => void;
  onDelete?: (agreementId: string) => void;
}

export default function AgreementTable({
  data,
  onDelete,
  onEdit,
  onDownload,
}: AgreementTableProps) {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalEntries = data.length;

  // Reset to page 1 if data length shrinks and current page is out of bounds
  const maxPage = Math.ceil(totalEntries / pageSize) || 1;
  const safePage = currentPage > maxPage ? maxPage : currentPage;

  const paginatedData = data.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Scrollable container with smooth scrolling and custom scrollbar styling */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
            <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Agreement ID</th>
              <th className="py-3 px-4">Client & Scope</th>
              <th className="py-3 px-4">Billing Cycle</th>
              <th className="py-3 px-4">SLA Tier</th>
              <th className="py-3 px-4">Effective Dates</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Monthly Value</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, i) => (
                <tr
                  key={i}
                  onClick={() =>
                    router.push(`/finance/agreements/detail/${item.id}`)
                  }
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-4 font-bold text-primary whitespace-nowrap">
                    {item.id}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {item.title}
                    </div>
                  </td>
                  <td className="py-4 px-4 min-w-[220px]">
                    <p className="font-semibold text-foreground">
                      {item.client}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.desc}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                    {item.cycle}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-muted rounded-md font-medium text-foreground inline-block">
                      {item.tier}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                    {item.dates}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 font-semibold rounded-full ${
                        item.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : item.status === "Under Review" ||
                              item.status === "Pending Review"
                            ? "bg-amber-500/10 text-amber-500"
                            : item.status === "Expiring"
                              ? "bg-orange-500/10 text-orange-500"
                              : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-foreground whitespace-nowrap">
                    {item.value}
                  </td>

                  <td
                    onClick={(e) => e.stopPropagation()}
                    className="py-4 px-4 text-right whitespace-nowrap"
                  >
                    <div className="inline-flex items-center justify-end gap-1.5 text-muted-foreground">
                      <Tooltip content="Edit agreement">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit && onEdit(item);
                          }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg hover:text-primary transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Download contract">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload && onDownload(item.id);
                          }}
                          className="p-1.5 hover:bg-primary/10 rounded-lg hover:text-primary transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Delete agreement">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(item.id);
                          }}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No agreements found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Imported Pagination Bar */}
      {totalEntries > 0 && (
        <PaginationBar
          page={safePage}
          pageSize={pageSize}
          total={totalEntries}
          onPageChange={(newPage) => setCurrentPage(newPage)}
          entriesLabel="agreements"
        />
      )}
    </div>
  );
}
