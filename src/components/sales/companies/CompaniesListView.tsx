"use client";

import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { COMPANY_GROUPS, type CompanyGroup } from "@/lib/companies/types";
import type { CompanyFilters } from "./FilterCompaniesPanel";
import { cn } from "@/lib/utils";
import { TableDisplayOptionsMenu } from "@/components/common/TableDisplayOptionsMenu";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";

interface CompaniesListViewProps {
  groups?: CompanyGroup[];
  filters?: CompanyFilters;
}

const DEFAULT_COMPANY_COLUMNS: ManageColumn[] = [
  { id: "company", label: "Company", checked: true, required: true },
  { id: "website", label: "Website", checked: true },
  { id: "industry", label: "Industry", checked: true },
  { id: "phone", label: "Phone", checked: true },
  { id: "status", label: "Status", checked: true },
  { id: "owner", label: "Owner", checked: true },
  { id: "revenue", label: "Revenue", checked: true },
  { id: "actions", label: "Actions", checked: true },
];

type CompanyRow = ReturnType<typeof buildAllCompaniesShape>;
function buildAllCompaniesShape(groups: CompanyGroup[]) {
  return groups.flatMap((group) =>
    group.companies.map((c) => ({
      ...c,
      statusTitle: group.title,
      statusDotColor: group.dotColorClass,
    })),
  )[0];
}

interface ColumnRenderer {
  th: React.ReactNode;
  thClassName?: string;
  td: (company: CompanyRow) => React.ReactNode;
  tdClassName?: string;
}

const columnRenderers: Record<string, ColumnRenderer> = {
  company: {
    th: "Company",
    tdClassName: "px-3 py-2 whitespace-nowrap",
    td: (company) => (
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${company.avatarBgClass}`}
        >
          {company.initials}
        </div>
        <span className="font-semibold text-slate-900">{company.name}</span>
      </div>
    ),
  },
  website: {
    th: "Website",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-500",
    td: (company) => company.website || "",
  },
  industry: {
    th: "Industry",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (company) => company.industry || "",
  },
  phone: {
    th: "Phone",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (company) => company.phone || "",
  },
  status: {
    th: "Status",
    tdClassName: "px-3 py-2 whitespace-nowrap",
    td: (company) => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        <span
          className={`h-1.5 w-1.5 rounded-full ${company.statusDotColor}`}
        />
        {company.statusTitle}
      </span>
    ),
  },
  owner: {
    th: "Owner",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (company) => company.owner,
  },
  revenue: {
    th: "Revenue",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-500",
    td: (company) => company.annualRevenue || "",
  },
  actions: {
    th: "Actions",
    thClassName: "px-3 py-2.5 text-right",
    tdClassName: "px-3 py-2 text-right",
    td: () => (
      <button
        type="button"
        aria-label="More actions"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
    ),
  },
};

export function CompaniesListView({
  groups = COMPANY_GROUPS,
  filters,
}: CompaniesListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [manageColumns, setManageColumns] = useState<ManageColumn[]>(
    DEFAULT_COMPANY_COLUMNS,
  );

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

  const orderedVisibleColumns = useMemo(
    () => manageColumns.filter((c) => c.checked),
    [manageColumns],
  );

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
          <thead className="border-b border-slate-100 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr className="sticky top-0 z-10 bg-slate-50/80">
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

              {orderedVisibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={
                    columnRenderers[col.id]?.thClassName ?? "px-3 py-2.5"
                  }
                >
                  {columnRenderers[col.id]?.th}
                </th>
              ))}

              <th
                className={cn(
                  "sticky right-0 z-20 -mr-3 bg-slate-50/80 pr-3 pl-3 text-right",
                  "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.06)]",
                )}
              >
                <TableDisplayOptionsMenu
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  onManageColumns={() => setManageColumnsOpen(true)}
                  className="flex justify-end"
                />
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

                {orderedVisibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className={
                      columnRenderers[col.id]?.tdClassName ?? "px-3 py-2"
                    }
                  >
                    {columnRenderers[col.id]?.td(company)}
                  </td>
                ))}

                <td className="px-3 py-2" />
              </tr>
            ))}
            {pagedCompanies.length === 0 && (
              <tr>
                <td
                  colSpan={orderedVisibleColumns.length + 2}
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

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={(cols) => {
          setManageColumns(cols);
          setManageColumnsOpen(false);
        }}
      />
    </div>
  );
}
