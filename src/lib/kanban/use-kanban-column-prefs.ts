"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addKanbanColumnPrefTitle,
  columnTitleMap,
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
  const [columns, setColumns] = useState<KanbanColumnPref[]>(defaults);

  useEffect(() => {
    setColumns(loadKanbanColumnPrefs(storageKey, defaultsRef.current));
  }, [storageKey]);

  const visibleIds = useMemo(
    () => columns.filter((col) => col.visible).map((col) => col.id),
    [columns],
  );
  const titles = useMemo(() => columnTitleMap(columns), [columns]);

  function save(next: KanbanColumnPref[]) {
    setColumns(next);
    persistKanbanColumnPrefs(storageKey, next);
  }

  return {
    columns,
    visibleIds,
    titles,
    toggle(columnId: string) {
      save(toggleKanbanColumnPref(columns, columnId));
    },
    rename(columnId: string, nextLabel: string) {
      save(renameKanbanColumnPref(columns, columnId, nextLabel));
    },
    reorder(draggedId: string, targetId: string) {
      save(reorderKanbanColumnPref(columns, draggedId, targetId));
    },
    addTitle(title: string): string | null {
      const result = addKanbanColumnPrefTitle(columns, title);
      if (!result.ok) return result.error;
      save(result.columns);
      return null;
    },
  };
}
