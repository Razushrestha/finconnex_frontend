/** Persist show/hide + display titles for kanban column stages. */

export type KanbanColumnPref = {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
};

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
