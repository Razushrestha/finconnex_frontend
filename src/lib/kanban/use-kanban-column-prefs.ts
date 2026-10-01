"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addKanbanColumnPrefTitle,
  columnColorMap,
  columnTitleMap,
  editKanbanColumnPref,
  ensureStageColors,
  loadKanbanColumnPrefs,
  persistKanbanColumnPrefs,
  renameKanbanColumnPref,
  reorderKanbanColumnPref,
  toggleKanbanColumnPref,
  type KanbanColumnPref,
} from "@/lib/kanban/column-prefs";

export function useKanbanColumnPrefs(
  storageKey: string,
  defaults: KanbanColumnPref[],
) {
  const defaultsRef = useRef(defaults);
  const [columns, setColumns] = useState<KanbanColumnPref[]>(() =>
    ensureStageColors(defaults),
  );

  useEffect(() => {
    setColumns(loadKanbanColumnPrefs(storageKey, defaultsRef.current));
  }, [storageKey]);

  const visibleIds = useMemo(
    () => columns.filter((col) => col.visible).map((col) => col.id),
    [columns],
  );
  const titles = useMemo(() => columnTitleMap(columns), [columns]);
  const colors = useMemo(() => columnColorMap(columns), [columns]);

  function save(next: KanbanColumnPref[]) {
    setColumns(next);
    persistKanbanColumnPrefs(storageKey, next);
  }

  return {
    columns,
    visibleIds,
    titles,
    colors,
    toggle(columnId: string) {
      save(toggleKanbanColumnPref(columns, columnId));
    },
    rename(columnId: string, nextLabel: string) {
      save(renameKanbanColumnPref(columns, columnId, nextLabel));
    },
    reorder(
      draggedId: string,
      targetId: string,
      place: "before" | "after" = "before",
    ) {
      save(reorderKanbanColumnPref(columns, draggedId, targetId, place));
    },
    edit(columnId: string, next: { label: string; color?: string }) {
      save(editKanbanColumnPref(columns, columnId, next));
    },
    addTitle(title: string, color?: string): string | null {
      const result = addKanbanColumnPrefTitle(columns, title, color);
      if (!result.ok) return result.error;
      save(ensureStageColors(result.columns));
      return null;
    },
  };
}
