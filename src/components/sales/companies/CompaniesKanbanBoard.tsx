"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { type CompanyGroup, type CompanyStatus } from "@/lib/companies/types";
import {
  listCompanyGroups,
  saveCompanyGroups,
} from "@/lib/companies/store";
import { onRulesChange } from "@/lib/rules";
import type { CompanyFilters } from "./FilterCompaniesPanel";
import { companyMatchesFilters } from "@/lib/filters/records";
import { CompanyCard } from "./CompanyCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_HEADER_TITLE,
  KANBAN_WELL,
} from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { CompanyCardCustomizationSettings } from "@/components/sales/companies/CustomizeCompanyCardDrawer";

interface DragInfo {
  companyId: string;
  sourceGroupId: string;
}

interface DropTargetPosition {
  groupId: string;
  targetIndex: number;
}

type CompanyRecord = CompanyGroup["companies"][number];

interface CompaniesKanbanBoardProps {
  filters?: CompanyFilters;
  visibleColumnIds?: string[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onAddLead?: (columnId: string) => void;
  onQuickAction?: (kind: any, company: CompanyRecord) => void;
}

export function CompaniesKanbanBoard({
  filters,
  visibleColumnIds,
  selectedIds = [],
  onToggleSelect,
  onAddLead,
  onQuickAction,
}: CompaniesKanbanBoardProps) {
  const router = useRouter();

  const [groups, setGroups] = useState<CompanyGroup[]>(() =>
    listCompanyGroups(),
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPosition | null>(
    null,
  );
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  // Board-wide card customization settings
  const [cardSettings, setCardSettings] =
    useState<CompanyCardCustomizationSettings | null>(null);

  useEffect(() => {
    return onRulesChange(() => setGroups(listCompanyGroups()));
  }, []);

  function persist(next: CompanyGroup[]) {
    setGroups(next);
    saveCompanyGroups(next);
  }

  function toggleCollapsed(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const visibleGroups = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasColumnFilter = !!visibleColumnIds;

    const result = hasColumnFilter
      ? visibleColumnIds!
          .map((id) => groups.find((g) => g.id === id))
          .filter((g): g is CompanyGroup => !!g)
      : groups;

    return result
      .filter((g) => !hasStatusFilter || filters!.statuses.includes(g.title))
      .map((g) => ({
        ...g,
        companies: g.companies.filter((c) =>
          companyMatchesFilters({ ...c, statusTitle: g.title }, filters),
        ),
      }));
  }, [groups, filters, visibleColumnIds]);

  function visibleCompanyCount(group: CompanyGroup) {
    if (dragInfo && dragInfo.sourceGroupId === group.id) {
      return group.companies.length - 1;
    }
    return group.companies.length;
  }

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
    setDropTargetPos(null);
    setOverGroupId(null);
  }

  /** Shared move: pulls the company out of the source group, drops it into the target at targetIndex. */
  function moveCompany(
    company: CompanyRecord,
    sourceGroup: CompanyGroup,
    targetGroup: CompanyGroup,
    updatedCompany: CompanyRecord,
    targetIndex?: number,
  ) {
    persist(
      groups.map((g) => {
        if (g.id === sourceGroup.id && g.id === targetGroup.id) {
          // Reordering within the same group.
          const filtered = g.companies.filter((c) => c.id !== company.id);
          const insertAt =
            targetIndex !== undefined ? targetIndex : filtered.length;
          const next = [...filtered];
          next.splice(insertAt, 0, updatedCompany);
          return { ...g, companies: next };
        }
        if (g.id === sourceGroup.id) {
          return {
            ...g,
            companies: g.companies.filter((c) => c.id !== company.id),
          };
        }
        if (g.id === targetGroup.id) {
          const filtered = g.companies.filter((c) => c.id !== company.id);
          const insertAt =
            targetIndex !== undefined ? targetIndex : filtered.length;
          const next = [...filtered];
          next.splice(insertAt, 0, updatedCompany);
          return { ...g, companies: next };
        }
        return g;
      }),
    );
  }

  function handleDrop(targetGroupId: string, targetIndex?: number) {
    setOverGroupId(null);
    setDropTargetPos(null);
    if (!dragInfo) return;
    const { companyId, sourceGroupId } = dragInfo;

    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    const company = sourceGroup?.companies.find((c) => c.id === companyId);

    if (!company || !sourceGroup || !targetGroup) {
      setDragInfo(null);
      return;
    }

    const updatedCompany =
      sourceGroup.id === targetGroup.id
        ? company
        : { ...company, accentColorClass: targetGroup.dotColorClass };

    moveCompany(company, sourceGroup, targetGroup, updatedCompany, targetIndex);
    if (sourceGroup.id !== targetGroup.id) {
      void import("@/lib/companies/api").then(({ updateCrmCompany, tryCrmCompany }) => {
        void tryCrmCompany(() =>
          updateCrmCompany(company.id, {
            status: targetGroup.title as CompanyStatus,
          }),
        );
      });
    }
    setDragInfo(null);
  }

  return (
    <div className="relative h-full w-full overflow-x-auto overflow-y-hidden bg-slate-50">
      <div className={KANBAN_BOARD_ROW}>
        {visibleGroups.map((group) => {
          const isOver = overGroupId === group.id;
          const isCollapsed = collapsedGroups.has(group.id);

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
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={group.title}
                  count={group.companies.length}
                  onExpand={() => toggleCollapsed(group.id)}
                />
              ) : (
                <>
                  <div className={KANBAN_HEADER}>
                    <div className="flex h-6 items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className={KANBAN_HEADER_TITLE} title={group.title}>
                          {group.title}
                        </h2>
                        <span className={KANBAN_HEADER_COUNT}>
                          {group.companies.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <KanbanStageScroll
                    footer={
                      <KanbanColumnFooter
                        createLabel="Create Company"
                        onCreate={() => router.push("/sales/companies/create")}
                        onCollapse={() => toggleCollapsed(group.id)}
                        collapseLabel={`Collapse ${group.title}`}
                      />
                    }
                  >
                  <div
                    className={cn(
                      "relative flex min-h-full flex-col rounded-sm border p-1",
                      dropTargetIdle,
                      isOver
                        ? dropTargetActive
                        : KANBAN_WELL,
                    )}
                  >
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragInfo) {
                          setOverGroupId(group.id);
                          if (
                            !dropTargetPos ||
                            dropTargetPos.groupId !== group.id
                          ) {
                            setDropTargetPos({
                              groupId: group.id,
                              targetIndex: visibleCompanyCount(group),
                            });
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDrop(group.id, dropTargetPos?.targetIndex);
                      }}
                      className="flex min-h-[180px] flex-1 flex-col gap-3 pb-8"
                    >
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          dragInfo &&
                          dropTargetPos?.groupId === group.id &&
                          dropTargetPos.targetIndex === idx;

                        group.companies.forEach((company) => {
                          const isDraggedCompany =
                            dragInfo?.companyId === company.id;
                          const myIndex = visibleIndex;

                          if (!isDraggedCompany && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${company.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          rendered.push(
                            <div
                              key={company.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!dragInfo || isDraggedCompany) return;

                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const midpoint = rect.top + rect.height / 2;
                                const insertIndex =
                                  e.clientY < midpoint ? myIndex : myIndex + 1;

                                setDropTargetPos({
                                  groupId: group.id,
                                  targetIndex: insertIndex,
                                });
                              }}
                            >
                              <CompanyCard
                                company={company}
                                isDragging={isDraggedCompany}
                                isSelected={selectedIds.includes(company.id)}
                                onToggleSelect={() =>
                                  onToggleSelect?.(company.id)
                                }
                                onDragStart={(e) =>
                                  handleDragStart(e, company.id, group.id)
                                }
                                onDragEnd={handleDragEnd}
                                onQuickAction={(kind) =>
                                  onQuickAction?.(kind, company)
                                }
                                onSaveCardSettings={(settings) =>
                                  setCardSettings(settings)
                                }
                              />
                            </div>,
                          );

                          if (!isDraggedCompany) visibleIndex++;
                        });

                        if (showPlaceholderAt(visibleIndex)) {
                          rendered.push(
                            <div
                              key="placeholder-end"
                              className={KANBAN_DROP_GHOST}
                            />,
                          );
                        }

                        return (
                          <>
                            {rendered}
                            {group.companies.length === 0 ? (
                              <KanbanEmptyStage entity="Companies" />
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  </KanbanStageScroll>
                </>
              )}
            </div>
          );
        })}

        {visibleGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No companies match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
