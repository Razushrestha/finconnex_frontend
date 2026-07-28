"use client";

import { useMemo, useState } from "react";
import { MoreVertical, SlidersHorizontal } from "lucide-react";
import { COMPANY_GROUPS, type CompanyGroup } from "@/lib/companies/types";
import type { CompanyFilters } from "./FilterCompaniesPanel";
import { cn } from "@/lib/utils";

interface CompaniesListViewProps {
  groups?: CompanyGroup[];
  filters?: CompanyFilters;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function CompaniesListView({
  groups = COMPANY_GROUPS,
  filters,
}: CompaniesListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);

  const allCompanies = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    return groups
      .filter(
        (group) => !hasStatusFilter || filters!.statuses.includes(group.title),
      )
      .flatMap((group) =>
        group.companies.map((c) => ({
          ...c,
          statusTitle: group.title,
          statusDotColor: group.dotColorClass,
        })),
      );
  }, [groups, filters]);

  const pagedCompanies = useMemo(
    () => allCompanies.slice(0, pageSize),
    [allCompanies, pageSize],
  );

  const allSelected =
    pagedCompanies.length > 0 &&
    pagedCompanies.every((c) => selectedIds.has(c.id));
  const someSelected =
    pagedCompanies.some((c) => selectedIds.has(c.id)) && !allSelected;

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set([...prev, ...pagedCompanies.map((c) => c.id)]);
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all companies"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </th>
              <th className="px-3 py-2.5">Company</th>
              <th className="px-3 py-2.5">Website</th>
              <th className="px-3 py-2.5">Industry</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Revenue</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
              <th className="relative px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => setPageSizeMenuOpen((o) => !o)}
                  aria-label="Table display options"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                </button>
                {pageSizeMenuOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-slate-100 bg-white py-1 text-left text-[11px] font-normal normal-case text-slate-600 shadow-lg">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setPageSizeMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-50",
                          pageSize === size && "font-semibold text-slate-900",
                        )}
                      >
                        Show {size}
                      </button>
                    ))}
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {pagedCompanies.map((company) => (
              <tr
                key={company.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(company.id)}
                    onChange={() => toggleOne(company.id)}
                    aria-label={`Select ${company.name}`}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${company.avatarBgClass}`}
                    >
                      {company.initials}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {company.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {company.website || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {company.industry || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {company.phone || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${company.statusDotColor}`}
                    />
                    {company.statusTitle}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {company.owner}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {company.annualRevenue || ""}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </td>
                <td className="px-3 py-2" />
              </tr>
            ))}
            {pagedCompanies.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-12 text-center text-sm text-slate-400"
                >
                  No companies match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Showing {pagedCompanies.length} of {allCompanies.length} companies
      </div>
    </div>
  );
}
