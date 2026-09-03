import type {
  FieldClause,
  FilterFieldDef,
  FilterOperator,
} from "@/lib/filters/types";
import { operatorNeedsValue } from "@/lib/filters/types";

function asText(raw: unknown): string {
  if (raw == null) return "";
  if (Array.isArray(raw)) return raw.map((item) => String(item)).join(", ");
  return String(raw).trim();
}

export function parseFilterNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseFilterDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function isBlank(raw: unknown) {
  if (raw == null) return true;
  if (Array.isArray(raw)) return raw.length === 0;
  if (typeof raw === "number") return false;
  return asText(raw) === "";
}

function noneValue(value: string) {
  return !value.trim() || value.trim().toLowerCase() === "none";
}

function matchText(raw: unknown, operator: FilterOperator, value: string) {
  const left = asText(raw).toLowerCase();
  const right = value.trim().toLowerCase();
  if (operator === "is") return left === right;
  if (operator === "is_not") return left !== right;
  if (operator === "contains") return left.includes(right);
  if (operator === "not_contains") return !left.includes(right);
  if (operator === "starts_with") return left.startsWith(right);
  return true;
}

function matchNumber(raw: unknown, operator: FilterOperator, value: string) {
  const left = parseFilterNumber(raw);
  const right = parseFilterNumber(value);
  if (left == null || right == null) return false;
  if (operator === "eq" || operator === "is") return left === right;
  if (operator === "gt") return left > right;
  if (operator === "lt") return left < right;
  if (operator === "gte") return left >= right;
  if (operator === "lte") return left <= right;
  return true;
}

function matchDate(raw: unknown, operator: FilterOperator, value: string) {
  const left = parseFilterDate(raw);
  const right = parseFilterDate(value);
  if (!left || !right) return false;
  const a = startOfDay(left);
  const b = startOfDay(right);
  if (operator === "is") return a === b;
  if (operator === "before") return a < b;
  if (operator === "after") return a > b;
  if (operator === "on_or_before") return a <= b;
  if (operator === "on_or_after") return a >= b;
  return true;
}

export function matchClause(
  raw: unknown,
  clause: FieldClause,
  field?: FilterFieldDef,
): boolean {
  if (clause.operator === "is_empty") return isBlank(raw);
  if (clause.operator === "is_not_empty") return !isBlank(raw);
  if (!operatorNeedsValue(clause.operator)) return true;
  if (!clause.value.trim()) return true;

  const type = field?.type ?? "text";
  if (
    (type === "select" || type === "text") &&
    (clause.operator === "is" || clause.operator === "is_not") &&
    noneValue(clause.value)
  ) {
    const empty = isBlank(raw);
    return clause.operator === "is" ? empty : !empty;
  }
  if (type === "number" || type === "money") {
    return matchNumber(raw, clause.operator, clause.value);
  }
  if (type === "date") {
    return matchDate(raw, clause.operator, clause.value);
  }
  return matchText(raw, clause.operator, clause.value);
}

export function matchesFieldClauses(
  clauses: FieldClause[] | undefined,
  getValue: (fieldId: string) => unknown,
  fields: FilterFieldDef[],
): boolean {
  if (!clauses?.length) return true;
  const byId = new Map(fields.map((field) => [field.id, field]));
  const grouped = new Map<string, FieldClause[]>();
  for (const clause of clauses) {
    const list = grouped.get(clause.fieldId) ?? [];
    list.push(clause);
    grouped.set(clause.fieldId, list);
  }
  for (const [fieldId, fieldClauses] of grouped) {
    const field = byId.get(fieldId);
    const raw = getValue(fieldId);
    for (const clause of fieldClauses) {
      if (!matchClause(raw, clause, field)) return false;
    }
  }
  return true;
}

export function matchesSystemDefined(
  selected: string[] | undefined,
  record: { createdDate?: string; modifiedDate?: string },
): boolean {
  if (!selected?.length) return true;
  const touched = Boolean(
    record.modifiedDate &&
      record.modifiedDate !== record.createdDate &&
      record.modifiedDate.trim(),
  );
  if (selected.includes("Touched Records") && !touched) return false;
  if (selected.includes("Untouched Records") && touched) return false;
  return true;
}

export function countActiveFilters(value: {
  groups?: Record<string, string[]>;
  clauses?: FieldClause[];
}) {
  const groupCount = Object.values(value.groups ?? {}).reduce(
    (sum, items) => sum + items.length,
    0,
  );
  const clauseCount = (value.clauses ?? []).filter(
    (clause) =>
      !operatorNeedsValue(clause.operator) || clause.value.trim().length > 0,
  ).length;
  return groupCount + clauseCount;
}
