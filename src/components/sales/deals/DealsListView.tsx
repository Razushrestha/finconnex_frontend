"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  MoreVertical,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";
import { type DealPipeline, type DealStage } from "@/lib/deals/types";
import { listDealPipelines } from "@/lib/deals/store";
import { onRulesChange } from "@/lib/rules";
import type { DealFilters } from "./FilterDealsPanel";
import { dealMatchesFilters } from "@/lib/filters/records";
import { StatusColorPill } from "@/components/common/StatusColorPill";
import { ContactNameLink } from "@/components/sales/ContactNameLink";
import { resolveDealContact } from "@/lib/sales/resolve-contact";
import { ResizableColumns } from "@/components/common/ResizableColumns";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";
import {
  applyTablePreferenceToColumns,
  getCrmTablePreference,
  isEmptyTablePreference,
  persistCrmTablePreference,
  tablePreferenceFromColumns,
  tryCrmTablePreference,
} from "@/lib/table-preferences/api";

interface DealsListViewProps {
  pipeline: DealPipeline;
  stages?: DealStage[];
  filters?: DealFilters;
}

const DEFAULT_DEAL_COLUMNS: ManageColumn[] = [
  { id: "name", label: "Deal Name", checked: true, required: true },
  { id: "contactName", label: "Contact Name", checked: true },
  { id: "email", label: "Email", checked: true },
  { id: "stage", label: "Stage", checked: true },
  { id: "value", label: "Value", checked: true },
  { id: "account", label: "Account", checked: true },
  { id: "owner", label: "Owner", checked: true },
  { id: "closeDate", label: "Expected Close", checked: true },
  { id: "actions", label: "Actions", checked: true },
];

// Row shape as produced by the allDeals useMemo below
type DealRow = ReturnType<typeof buildAllDealsShape>;
// Helper purely for type inference — never called
function buildAllDealsShape(stages: DealStage[]) {
  return stages.flatMap((stage) =>
    stage.deals.map((deal) => ({
      ...deal,
      stageTitle: stage.title,
      stageDotColor: stage.dotColorClass,
    })),
  )[0];
}

interface ColumnRenderer {
  th: React.ReactNode;
  thClassName?: string;
  td: (deal: DealRow) => React.ReactNode;
  tdClassName?: string;
}

const columnRenderers: Record<string, ColumnRenderer> = {
  name: {
    th: "Deal Name",
    thClassName: "px-5 py-3.5 text-left font-semibold",
    tdClassName: "px-5 py-1 whitespace-nowrap",
    td: (deal) => (
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${deal.avatarBgClass}`}
        >
          {deal.initials}
        </div>
        <span className="font-semibold text-slate-900">{deal.name}</span>
      </div>
    ),
  },
  contactName: {
    th: "Contact Name",
    thClassName: "px-5 py-3.5 text-left font-semibold",
    tdClassName: "px-5 py-1 whitespace-nowrap text-[13px]",
    td: (deal) => {
      const contact = resolveDealContact(deal);
      return <ContactNameLink name={contact.name} contactId={contact.id} />;
    },
  },
  email: {
    th: "Email",
    thClassName: "px-5 py-3.5 text-left font-semibold",
    tdClassName: "px-5 py-1 whitespace-nowrap text-slate-600",
    td: (deal) => resolveDealContact(deal).email || "",
  },
  stage: {
    th: "Stage",
    tdClassName: "px-5 py-1 whitespace-nowrap",
    td: (deal) => (
      <StatusColorPill label={deal.stageTitle} solidClass={deal.stageDotColor} />
    ),
  },
  value: {
    th: "Value",
    tdClassName: "px-5 py-1 whitespace-nowrap font-medium text-slate-900",
    td: (deal) => `${deal.value} ${deal.currency}`,
  },
  account: {
    th: "Account",
    tdClassName: "px-5 py-1 whitespace-nowrap text-slate-500",
    td: (deal) => (
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>{deal.account}</span>
      </div>
    ),
  },
  owner: {
    th: "Owner",
    tdClassName: "px-5 py-1 whitespace-nowrap text-slate-600",
    td: (deal) => deal.owner,
  },
  closeDate: {
    th: "Expected Close",
    tdClassName: "px-5 py-1 whitespace-nowrap text-slate-500",
    td: (deal) => (
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>{deal.closeDate}</span>
      </div>
    ),
  },
  actions: {
    th: "Actions",
    thClassName: "px-5 py-3.5 text-left font-semibold",
    tdClassName: "px-5 py-1 whitespace-nowrap text-right",
    td: () => (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          aria-label="Web link"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Call"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <PhoneCall className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Refresh"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Layers"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="More"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    ),
  },
};

export function DealsListView({
  pipeline,
  stages: stagesProp,
  filters,
}: DealsListViewProps) {
  const [stages, setStages] = useState<DealStage[]>(
    () => stagesProp ?? listDealPipelines()[pipeline] ?? [],
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [manageColumns, setManageColumns] =
    useState<ManageColumn[]>(DEFAULT_DEAL_COLUMNS);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (stagesProp) setStages(stagesProp);
    else setStages(listDealPipelines()[pipeline] ?? []);
  }, [stagesProp, pipeline]);

  useEffect(() => {
    void tryCrmTablePreference(() => getCrmTablePreference("deals")).then(
      (pref) => {
        if (pref && !isEmptyTablePreference(pref)) {
          setManageColumns(
            applyTablePreferenceToColumns(DEFAULT_DEAL_COLUMNS, pref),
          );
        }
      },
    );
  }, []);

  useEffect(() => {
    return onRulesChange(() => {
      if (!stagesProp) setStages(listDealPipelines()[pipeline] ?? []);
    });
  }, [stagesProp, pipeline]);

  const allDeals = useMemo(() => {
    const hasStageFilter = !!filters?.stages.length;

    return stages
      .filter(
        (stage) => !hasStageFilter || filters!.stages.includes(stage.title),
      )
      .flatMap((stage) =>
        stage.deals
          .filter((deal) =>
            dealMatchesFilters({ ...deal, stageTitle: stage.title }, filters),
          )
          .map((deal) => ({
            ...deal,
            stageTitle: stage.title,
            stageDotColor: stage.dotColorClass,
          })),
      );
  }, [stages, filters]);

  const pagedDeals = useMemo(
    () => allDeals.slice(0, pageSize),
    [allDeals, pageSize],
  );

  const allSelected =
    pagedDeals.length > 0 && pagedDeals.every((d) => selectedIds.has(d.id));
  const someSelected =
    pagedDeals.some((d) => selectedIds.has(d.id)) && !allSelected;

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set([...prev, ...pagedDeals.map((d) => d.id)]);
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

  const orderedVisibleColumns = useMemo(
    () => manageColumns.filter((c) => c.checked),
    [manageColumns],
  );

  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-2xs">
      <ResizableColumns
        storageKey="deals-list"
        className="overflow-x-auto"
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onManageColumns={() => setManageColumnsOpen(true)}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs tracking-wider text-slate-500 uppercase">
            <tr className="sticky top-0 z-10 bg-slate-50/70">
              <th scope="col" data-col-id="select" className="w-8 px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all deals"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </th>
              {orderedVisibleColumns.map((col) => (
                <th
                  key={col.id}
                  data-col-id={col.id}
                  scope="col"
                  className={
                    columnRenderers[col.id]?.thClassName ??
                    "px-5 py-3.5 text-left font-semibold"
                  }
                >
                  {columnRenderers[col.id]?.th}
                </th>
              ))}

              <th
                data-col-id="options"
                scope="col"
                className="sticky right-0 z-30 w-12 min-w-12 bg-slate-50/70 px-2 py-3.5 text-left"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {pagedDeals.map((deal) => (
              <tr
                key={deal.id}
                data-focus-id={deal.id}
                data-deal-id={deal.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-5 py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(deal.id)}
                    onChange={() => toggleOne(deal.id)}
                    aria-label={`Select ${deal.name}`}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </td>
                {orderedVisibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className={
                      columnRenderers[col.id]?.tdClassName ?? "px-5 py-1"
                    }
                  >
                    {columnRenderers[col.id]?.td(deal)}
                  </td>
                ))}

                <td className="px-5 py-1" />
              </tr>
            ))}

            {pagedDeals.length === 0 && (
              <tr>
                <td
                  colSpan={orderedVisibleColumns.length + 1}
                  className="px-5 py-12 text-center text-sm text-slate-400"
                >
                  No deals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResizableColumns>

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={(cols) => {
          setManageColumns(cols);
          persistCrmTablePreference(
            "deals",
            tablePreferenceFromColumns("deals", cols),
          );
          setManageColumnsOpen(false);
        }}
      />
    </div>
  );
}
