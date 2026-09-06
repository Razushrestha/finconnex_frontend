export type FilterValueType = "text" | "number" | "money" | "select" | "date";

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "eq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "is_empty"
  | "is_not_empty";

export type FilterFieldDef = {
  id: string;
  label: string;
  type: FilterValueType;
  options?: readonly string[];
};

export type FieldClause = {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string;
};

export type FilterSystemGroup = {
  id: string;
  title: string;
  options: readonly string[];
};

export type DeepFilterValue = {
  groups: Record<string, string[]>;
  clauses: FieldClause[];
};

export const EMPTY_DEEP_FILTER: DeepFilterValue = {
  groups: {},
  clauses: [],
};

export type OperatorOption = { id: FilterOperator; label: string };

export function defaultOperator(type: FilterValueType): FilterOperator {
  if (type === "select") return "is";
  if (type === "number" || type === "money") return "eq";
  if (type === "date") return "is";
  return "contains";
}

export function operatorsFor(type: FilterValueType): OperatorOption[] {
  if (type === "select") {
    return [
      { id: "is", label: "is" },
      { id: "is_not", label: "is not" },
      { id: "is_empty", label: "is empty" },
      { id: "is_not_empty", label: "is not empty" },
    ];
  }
  if (type === "number" || type === "money") {
    return [
      { id: "eq", label: "=" },
      { id: "gt", label: ">" },
      { id: "lt", label: "<" },
      { id: "gte", label: "≥" },
      { id: "lte", label: "≤" },
      { id: "is_empty", label: "is empty" },
      { id: "is_not_empty", label: "is not empty" },
    ];
  }
  if (type === "date") {
    return [
      { id: "is", label: "is" },
      { id: "before", label: "before" },
      { id: "after", label: "after" },
      { id: "on_or_before", label: "on or before" },
      { id: "on_or_after", label: "on or after" },
      { id: "is_empty", label: "is empty" },
      { id: "is_not_empty", label: "is not empty" },
    ];
  }
  return [
    { id: "contains", label: "contains" },
    { id: "not_contains", label: "doesn't contain" },
    { id: "is", label: "is" },
    { id: "is_not", label: "is not" },
    { id: "starts_with", label: "starts with" },
    { id: "is_empty", label: "is empty" },
    { id: "is_not_empty", label: "is not empty" },
  ];
}

export function newClauseId() {
  return `fc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createClause(field: FilterFieldDef): FieldClause {
  return {
    id: newClauseId(),
    fieldId: field.id,
    operator: defaultOperator(field.type),
    value: "",
  };
}

export function operatorNeedsValue(operator: FilterOperator) {
  return operator !== "is_empty" && operator !== "is_not_empty";
}
