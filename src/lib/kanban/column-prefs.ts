/** Persist show/hide + display titles for kanban column stages. */

import { bindKanbanStageTitle } from "@/lib/kanban/stage-titles";

export type KanbanColumnPref = {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
};

export function kanbanPrefsFromCatalog(
  items: { id: string; label: string }[],
): KanbanColumnPref[] {
  return items.map((item, index) => ({
    id: item.id,
    label: item.label,
    visible: true,
    required: index === 0,
  }));
}

export function toggleKanbanColumnPref(
  columns: KanbanColumnPref[],
  columnId: string,
): KanbanColumnPref[] {
  const target = columns.find((col) => col.id === columnId);
  if (target?.required && target.visible) return columns;
  const next = columns.map((col) =>
    col.id === columnId ? { ...col, visible: !col.visible } : col,
  );
  if (!next.some((col) => col.visible)) return columns;
  return next;
}

export function renameKanbanColumnPref(
  columns: KanbanColumnPref[],
  columnId: string,
  nextLabel: string,
): KanbanColumnPref[] {
  const label = nextLabel.trim();
  if (!label) return columns;
  return columns.map((col) =>
    col.id === columnId ? { ...col, label } : col,
  );
}

export function reorderKanbanColumnPref(
  columns: KanbanColumnPref[],
  draggedId: string,
  targetId: string,
): KanbanColumnPref[] {
  const next = [...columns];
  const fromIndex = next.findIndex((col) => col.id === draggedId);
  const toIndex = next.findIndex((col) => col.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return columns;
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return columns;
  next.splice(toIndex, 0, moved);
  return next;
}

export function addKanbanColumnPrefTitle(
  columns: KanbanColumnPref[],
  title: string,
):
  | { ok: true; columns: KanbanColumnPref[] }
  | { ok: false; error: string } {
  const bound = bindKanbanStageTitle({
    stages: columns,
    selectedStageIds: columns.filter((col) => col.visible).map((col) => col.id),
    stageLabels: columnTitleMap(columns),
    title,
  });
  if (!bound.ok) return bound;
  const selected = new Set(bound.selectedStageIds);
  return {
    ok: true,
    columns: columns.map((col) => ({
      ...col,
      visible: selected.has(col.id),
      label: bound.stageLabels[col.id] ?? col.label,
    })),
  };
}

export function loadKanbanColumnPrefs(
  storageKey: string,
  defaults: KanbanColumnPref[],
): KanbanColumnPref[] {
  if (typeof window === "undefined") return defaults.map((col) => ({ ...col }));
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults.map((col) => ({ ...col }));
    const parsed = JSON.parse(raw) as Partial<KanbanColumnPref>[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return defaults.map((col) => ({ ...col }));
    }
    const byId = new Map(
      parsed
        .filter((row) => row && typeof row.id === "string")
        .map((row) => [row.id!, row] as const),
    );
    const ordered: KanbanColumnPref[] = [];
    for (const row of parsed) {
      if (!row?.id) continue;
      const base = defaults.find((col) => col.id === row.id);
      if (!base) continue;
      ordered.push({
        ...base,
        label:
          typeof row.label === "string" && row.label.trim()
            ? row.label.trim()
            : base.label,
        visible: row.visible !== false,
      });
    }
    for (const base of defaults) {
      if (ordered.some((col) => col.id === base.id)) continue;
      const saved = byId.get(base.id);
      ordered.push({
        ...base,
        label:
          typeof saved?.label === "string" && saved.label.trim()
            ? saved.label.trim()
            : base.label,
        visible: saved?.visible !== false,
      });
    }
    if (!ordered.some((col) => col.visible)) {
      const required = ordered.find((col) => col.required) ?? ordered[0];
      if (required) required.visible = true;
    }
    return ordered;
  } catch {
    return defaults.map((col) => ({ ...col }));
  }
}

export function persistKanbanColumnPrefs(
  storageKey: string,
  columns: KanbanColumnPref[],
) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch {
    /* ignore */
  }
}

export function columnTitleMap(
  columns: KanbanColumnPref[],
): Record<string, string> {
  return Object.fromEntries(columns.map((col) => [col.id, col.label]));
}
