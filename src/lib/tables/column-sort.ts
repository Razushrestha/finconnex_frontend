export type SortDirection = "asc" | "desc";

export type ColumnSort = {
  field: string;
  direction: SortDirection;
} | null;

const NON_SORTABLE = new Set([
  "select",
  "actions",
  "action",
  "options",
  "flags",
  "progress",
]);

export function isSortableColumnId(id: string): boolean {
  return !NON_SORTABLE.has(id);
}

export function toggleColumnSort(
  current: ColumnSort,
  field: string,
): { field: string; direction: SortDirection } {
  if (current?.field === field) {
    return {
      field,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { field, direction: "asc" };
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function parseMoneyOrNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return Number(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[$,\s]/g, "").replace(/%$/, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parse DD/MM/YYYY, "D Mon, YYYY", ISO, or Date. */
export function parseSortDate(value: unknown): number | null {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmy = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?/i,
  );
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    let hours = dmy[4] ? Number(dmy[4]) : 0;
    const minutes = dmy[5] ? Number(dmy[5]) : 0;
    const ampm = dmy[6]?.toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    const date = new Date(year, month, day, hours, minutes);
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }

  const mon = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (mon) {
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const month = months[mon[2]];
    if (month === undefined) return null;
    const date = new Date(Number(mon[3]), month, Number(mon[1]));
    const t = date.getTime();
    return Number.isNaN(t) ? null : t;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = Date.parse(trimmed);
    return Number.isNaN(t) ? null : t;
  }

  return null;
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "name" in item) {
          return String((item as { name: unknown }).name ?? "");
        }
        return String(item ?? "");
      })
      .join(" ");
  }
  return value;
}

export function compareSortValues(left: unknown, right: unknown): number {
  const a = normalizeValue(left);
  const b = normalizeValue(right);
  const emptyA = isEmpty(a);
  const emptyB = isEmpty(b);
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  const dateA = parseSortDate(a);
  const dateB = parseSortDate(b);
  if (dateA !== null && dateB !== null) return dateA - dateB;

  const numA = parseMoneyOrNumber(a);
  const numB = parseMoneyOrNumber(b);
  if (numA !== null && numB !== null) return numA - numB;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortRows<T>(
  rows: T[],
  sort: ColumnSort,
  getValue: (row: T, field: string) => unknown,
): T[] {
  if (!sort) return rows;
  const { field, direction } = sort;
  const mul = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const cmp = compareSortValues(getValue(a, field), getValue(b, field));
    return cmp * mul;
  });
}

export function recordSortValue<T>(row: T, field: string): unknown {
  return (row as Record<string, unknown>)[field];
}
