/** Persist show/hide + display titles for kanban column stages. */

import { bindKanbanStageTitle } from "@/lib/kanban/stage-titles";

const STAGE_COLOR_PALETTE = [
  "#3B82F6",
  "#06B6D4",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#EF4444",
  "#64748B",
] as const;

export function ensureStageColors(
  columns: KanbanColumnPref[],
): KanbanColumnPref[] {
  return columns.map((col, index) => ({
    ...col,
    color:
      typeof col.color === "string" && col.color.startsWith("#")
        ? col.color
        : STAGE_COLOR_PALETTE[index % STAGE_COLOR_PALETTE.length],
  }));
}

export function columnColorMap(
  columns: KanbanColumnPref[],
): Record<string, string> {
  return Object.fromEntries(
    columns
      .filter((col) => col.color)
      .map((col) => [col.id, col.color as string]),
  );
}

export type KanbanColumnPref = {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
  /** Header accent chosen in the stage editor. */
  color?: string;
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

/** Keep board columns in the same order as the Stages list. */
export function orderByVisibleIds<T extends { id: string }>(
  items: T[],
  visibleIds?: readonly string[],
): T[] {
  if (!visibleIds?.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = visibleIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  return ordered.length ? ordered : items;
}

export function reorderKanbanColumnPref(
  columns: KanbanColumnPref[],
  draggedId: string,
  targetId: string,
  place: "before" | "after" = "before",
): KanbanColumnPref[] {
  const next = [...columns];
  const fromIndex = next.findIndex((col) => col.id === draggedId);
  const toIndex = next.findIndex((col) => col.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return columns;
  let insert = place === "after" ? toIndex + 1 : toIndex;
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return columns;
  if (fromIndex < insert) insert -= 1;
  if (insert === fromIndex) return columns;
  next.splice(insert, 0, moved);
  return next;
}

export function editKanbanColumnPref(
  columns: KanbanColumnPref[],
  columnId: string,
  next: { label: string; color?: string },
): KanbanColumnPref[] {
  const label = next.label.trim();
  if (!label) return columns;
  return columns.map((col) =>
    col.id === columnId
      ? { ...col, label, color: next.color || col.color }
      : col,
  );
}

export function addKanbanColumnPrefTitle(
  columns: KanbanColumnPref[],
  title: string,
  color?: string,
):
  | { ok: true; columns: KanbanColumnPref[]; stageId: string }
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
    stageId: bound.stageId,
    columns: columns.map((col) => ({
      ...col,
      visible: selected.has(col.id),
      label: bound.stageLabels[col.id] ?? col.label,
      color: col.id === bound.stageId && color ? color : col.color,
    })),
  };
}

export function loadKanbanColumnPrefs(
  storageKey: string,
  defaults: KanbanColumnPref[],
): KanbanColumnPref[] {
  if (typeof window === "undefined") return ensureStageColors(defaults);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return ensureStageColors(defaults);
    const parsed = JSON.parse(raw) as Partial<KanbanColumnPref>[];
    if (!Array.isArray(parsed) || !parsed.length) {
      return ensureStageColors(defaults);
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
        color:
          typeof row.color === "string" && row.color.startsWith("#")
            ? row.color
            : base.color,
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
        color:
          typeof saved?.color === "string" && saved.color.startsWith("#")
            ? saved.color
            : base.color,
      });
    }
    if (!ordered.some((col) => col.visible)) {
      const required = ordered.find((col) => col.required) ?? ordered[0];
      if (required) required.visible = true;
    }
    return ensureStageColors(ordered);
  } catch {
    return ensureStageColors(defaults);
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
