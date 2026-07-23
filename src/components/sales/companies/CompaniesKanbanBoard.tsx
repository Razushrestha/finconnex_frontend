"use client";

import { useMemo, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { COMPANY_GROUPS, type CompanyGroup } from "@/lib/companies/types";
import type { CompanyFilters } from "./FilterCompaniesPanel";
import { CompanyCard } from "./CompanyCard";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DragInfo {
  companyId: string;
  sourceGroupId: string;
}

interface CompaniesKanbanBoardProps {
  filters?: CompanyFilters;
}

export function CompaniesKanbanBoard({ filters }: CompaniesKanbanBoardProps) {
  const [groups, setGroups] = useState<CompanyGroup[]>(COMPANY_GROUPS);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  const visibleGroups = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    if (!hasStatusFilter) return groups;
    return groups.filter((g) => filters!.statuses.includes(g.title));
  }, [groups, filters]);

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    companyId: string,
    groupId: string,
  ) {
    setDragInfo({ companyId, sourceGroupId: groupId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverGroupId(null);
  }

  function handleDrop(targetGroupId: string) {
    setOverGroupId(null);
    if (!dragInfo) return;
    const { companyId, sourceGroupId } = dragInfo;
    if (sourceGroupId === targetGroupId) {
      setDragInfo(null);
      return;
    }

    setGroups((prev) => {
      const sourceGroup = prev.find((g) => g.id === sourceGroupId);
      const targetGroup = prev.find((g) => g.id === targetGroupId);
      const company = sourceGroup?.companies.find((c) => c.id === companyId);
      if (!company || !targetGroup) return prev;

      const updated = {
        ...company,
        accentColorClass: targetGroup.dotColorClass,
      };

      return prev.map((g) => {
        if (g.id === sourceGroupId) {
          return {
            ...g,
            companies: g.companies.filter((c) => c.id !== companyId),
          };
        }
        if (g.id === targetGroupId) {
          return { ...g, companies: [updated, ...g.companies] };
        }
        return g;
      });
    });

    setDragInfo(null);
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-50/50">
      <div className="grid min-w-[1300px] grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {visibleGroups.map((group) => {
          const isOver = overGroupId === group.id;
          return (
            <div
              key={group.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragInfo) setOverGroupId(group.id);
              }}
              onDragLeave={() =>
                setOverGroupId((prev) => (prev === group.id ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(group.id);
              }}
              className={cn(
                "flex flex-col rounded-sm border p-3",
                dropTargetIdle,
                isOver
                  ? dropTargetActive
                  : "border-slate-200/60 bg-slate-100/60",
              )}
            >
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${group.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {group.title}
                  </h2>
                  <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {group.companies.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add company"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Column options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {group.companies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    isDragging={dragInfo?.companyId === company.id}
                    onDragStart={(e) =>
                      handleDragStart(e, company.id, group.id)
                    }
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {group.companies.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
                    Drop a company here
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {visibleGroups.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No companies match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
