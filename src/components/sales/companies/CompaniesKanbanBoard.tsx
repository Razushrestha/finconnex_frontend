"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { type CompanyGroup, type CompanyStatus } from "@/lib/companies/types";
import {
  listCompanyGroups,
  mergeCrmCompaniesIntoBoard,
  saveCompanyGroups,
} from "@/lib/companies/store";
import { onRulesChange } from "@/lib/rules";
import type { CompanyFilters } from "./FilterCompaniesPanel";
import { companyMatchesFilters } from "@/lib/filters/records";
import { sortCompanyCards } from "@/lib/companies/sort";
import { CompanyCard } from "./CompanyCard";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";
import { kanbanHeaderSurfaceStyle } from "@/components/common/KanbanViewControls";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_WELL,
} from "@/lib/layout";
import { useRouter } from "next/navigation";
import type { CompanyCardCustomizationSettings } from "@/components/sales/companies/CustomizeCompanyCardDrawer";

type CompanyRecord = CompanyGroup["companies"][number];

function CompanyStageHeader({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color?: string;
}) {
  const surface = kanbanHeaderSurfaceStyle(color ?? null);
  return (
    <div
      className={cn(
        "flex min-h-14 w-full shrink-0 flex-col justify-center overflow-hidden rounded-xs p-1.5",
        color ? surface.className : KANBAN_HEADER,
      )}
      style={color ? surface.style : undefined}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <h2
            className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-5 xl:text-sm"
            title={title}
            style={color ? { color } : undefined}
          >
            {title}
          </h2>
          <span className={cn(KANBAN_HEADER_COUNT, "mt-0.5")}>{count}</span>
        </div>
      </div>
    </div>
  );
}

interface CompaniesKanbanBoardProps {
  filters?: CompanyFilters;
  visibleColumnIds?: string[];
  /** Optional display title overrides keyed by group id. */
  columnTitles?: Record<string, string>;
  /** Header accent color keyed by group id. */
  columnHeaderColors?: Record<string, string>;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onAddLead?: (columnId: string) => void;
  onAddCompany?: (columnId: string) => void;
  onQuickAction?: (kind: any, company: CompanyRecord) => void;
  sortValue?: string;
  sortDirection?: "asc" | "desc";
}

export function CompaniesKanbanBoard({
  filters,
  visibleColumnIds,
  columnTitles,
  columnHeaderColors,
  selectedIds = [],
  onToggleSelect,
  onAddLead,
  onAddCompany,
  onQuickAction,
  sortValue,
  sortDirection = "asc",
}: CompaniesKanbanBoardProps) {
  const router = useRouter();

  const [groups, setGroups] = useState<CompanyGroup[]>(() =>
    listCompanyGroups(),
  );
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
        companies: sortCompanyCards(
          g.companies.filter((c) =>
            companyMatchesFilters({ ...c, statusTitle: g.title }, filters),
          ),
          sortValue,
          sortDirection,
        ),
      }));
  }, [groups, filters, visibleColumnIds, sortValue, sortDirection]);

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

  function commitDrop({
    itemId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {
    const sourceGroup = groups.find((g) => g.id === sourceColumnId);
    const targetGroup = groups.find((g) => g.id === targetColumnId);
    const company = sourceGroup?.companies.find((c) => c.id === itemId);

    if (!company || !sourceGroup || !targetGroup) return;

    const updatedCompany =
      sourceGroup.id === targetGroup.id
        ? company
        : { ...company, accentColorClass: targetGroup.dotColorClass };

    moveCompany(company, sourceGroup, targetGroup, updatedCompany, targetIndex);
    if (sourceGroup.id !== targetGroup.id) {
      void import("@/lib/companies/api").then(
        ({
          changeCrmCompanyStatus,
          getCrmCompany,
          tryCrmCompany,
          updateCrmCompany,
        }) => {
          void tryCrmCompany(async () => {
            try {
              await changeCrmCompanyStatus(
                [company.id],
                targetGroup.title as CompanyStatus,
              );
            } catch {
              await updateCrmCompany(company.id, {
                status: targetGroup.title as CompanyStatus,
                expectedVersion: company.version,
              });
            }
            return getCrmCompany(company.id);
          }).then((live) => {
            if (live) mergeCrmCompaniesIntoBoard([live]);
          });
        },
      );
    }
  }

  const drag = usePointerKanbanDrag({ onDrop: commitDrop });

  return (
    <div className="relative h-full w-full overflow-x-auto overflow-y-hidden bg-slate-50">
      <div className={KANBAN_BOARD_ROW}>
        {visibleGroups.map((group) => {
          const isOver = drag.overColumnId === group.id;
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div
              key={group.id}
              data-kanban-drop-column={group.id}
              className={cn(
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={columnTitles?.[group.id] ?? group.title}
                  count={group.companies.length}
                  onExpand={() => toggleCollapsed(group.id)}
                />
              ) : (
                <>
                  <CompanyStageHeader
                    title={columnTitles?.[group.id] ?? group.title}
                    count={group.companies.length}
                    color={columnHeaderColors?.[group.id]}
                  />

                  <KanbanStageScroll
                    footer={
                      <KanbanColumnFooter
                        createLabel="Create Company"
                        onCreate={() =>
                          onAddCompany
                            ? onAddCompany(group.id)
                            : router.push("/sales/companies/create")
                        }
                        onCollapse={() => toggleCollapsed(group.id)}
                        collapseLabel={`Collapse ${columnTitles?.[group.id] ?? group.title}`}
                        inert={drag.isDragging}
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
                    <div className="flex min-h-[180px] flex-1 flex-col gap-3 pb-8">
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          drag.dragInfo &&
                          drag.dropTargetPos?.columnId === group.id &&
                          drag.dropTargetPos.targetIndex === idx;

                        group.companies.forEach((company) => {
                          const isDraggedCompany = drag.isDraggingItem(
                            company.id,
                          );
                          const myIndex = visibleIndex;

                          if (!isDraggedCompany && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${company.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          const pointer = drag.cardPointerProps({
                            id: company.id,
                            columnId: group.id,
                            name: company.name,
                          });

                          rendered.push(
                            <div
                              key={company.id}
                              data-kanban-card-slot={company.id}
                            >
                              <CompanyCard
                                company={company}
                                isDragging={isDraggedCompany}
                                isSelected={selectedIds.includes(company.id)}
                                onToggleSelect={() =>
                                  onToggleSelect?.(company.id)
                                }
                                onDragPointerDown={pointer.onPointerDown}
                                onDragClickCapture={pointer.onClickCapture}
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
      <KanbanDragGhost ghost={drag.ghost} />
    </div>
  );
}
