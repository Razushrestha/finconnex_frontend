"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_CAPABLE_ENTITY_TYPES,
  AUTOMATION_FIELD_REGISTRY,
  type AutomationCondition,
  type AutomationConditionGroup,
  type AutomationConditionOperator,
  type AutomationEntityType,
} from "@/lib/automations/types";

const OPERATOR_LABEL: Record<AutomationConditionOperator, string> = {
  EQUALS: "is",
  NOT_EQUALS: "is not",
  CONTAINS: "contains",
  EXISTS: "is set",
  DOES_NOT_EXIST: "is not set",
  GREATER_THAN: "is greater than",
  LESS_THAN: "is less than",
  BEFORE: "is before",
  AFTER: "is after",
  IN_LIST: "is one of",
  OWNER_EQUALS: "is owner",
  STATUS_EQUALS: "is status",
  TAG_CONTAINS: "has tag",
};

function operatorsFor(fieldType: string): AutomationConditionOperator[] {
  switch (fieldType) {
    case "number":
      return ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "EXISTS", "DOES_NOT_EXIST"];
    case "date":
      return ["BEFORE", "AFTER", "EXISTS", "DOES_NOT_EXIST"];
    case "boolean":
      return ["EQUALS", "NOT_EQUALS"];
    case "array":
      return ["CONTAINS", "TAG_CONTAINS", "EXISTS", "DOES_NOT_EXIST"];
    default:
      return ["EQUALS", "NOT_EQUALS", "CONTAINS", "IN_LIST", "EXISTS", "DOES_NOT_EXIST"];
  }
}

function isActivityField(field: string): boolean {
  return field === "_activity.EMAIL" || field === "_activity.MESSAGE";
}

interface Props {
  entityType: AutomationEntityType;
  group: AutomationConditionGroup;
  onChange: (group: AutomationConditionGroup) => void;
}

/** Only the IF_ELSE step condition is edited here — a single flat ALL/ANY
 * group of leaf conditions. Nested groups exist in the backend's type but
 * aren't exposed in this first pass of the builder (kept to one level, which
 * covers the "wait then branch" and simple field-check use cases). */
export function ConditionBuilder({ entityType, group, onChange }: Props) {
  const fields = AUTOMATION_FIELD_REGISTRY[entityType];
  const activityCapable = ACTIVITY_CAPABLE_ENTITY_TYPES.includes(entityType);
  const items = group.items.filter((i): i is AutomationCondition => "field" in i);

  function update(index: number, patch: Partial<AutomationCondition>) {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange({ ...group, items: next });
  }

  function remove(index: number) {
    onChange({ ...group, items: items.filter((_, i) => i !== index) });
  }

  function addFieldCondition() {
    const [firstField, firstType] = Object.entries(fields)[0] ?? ["status", "string"];
    onChange({
      ...group,
      items: [
        ...items,
        { field: firstField, operator: operatorsFor(firstType)[0], value: "" },
      ],
    });
  }

  function addNoReplyCondition(channel: "EMAIL" | "MESSAGE") {
    onChange({
      ...group,
      items: [...items, { field: `_activity.${channel}`, operator: "DOES_NOT_EXIST" }],
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Match
        </span>
        <Select
          value={group.mode}
          onValueChange={(mode) => onChange({ ...group, mode: mode as "ALL" | "ANY" })}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All conditions (AND)</SelectItem>
            <SelectItem value="ANY">Any condition (OR)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-400">
          No conditions yet — everything will go down the &quot;Then&quot; branch.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, index) =>
          isActivityField(item.field) ? (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5"
            >
              <div className="text-xs text-teal-800">
                <span className="font-semibold">
                  {item.field === "_activity.EMAIL" ? "Email reply" : "Message reply"}
                </span>{" "}
                {item.operator === "DOES_NOT_EXIST" ? "has NOT been received" : "HAS been received"}{" "}
                since this workflow started
              </div>
              <div className="flex items-center gap-1">
                <Select
                  value={item.operator}
                  onValueChange={(operator) => update(index, { operator: operator as AutomationConditionOperator })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOES_NOT_EXIST">No reply</SelectItem>
                    <SelectItem value="EXISTS">Replied</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-2">
              <Select
                value={item.field}
                onValueChange={(field) => {
                  if (!field) return;
                  update(index, { field, operator: operatorsFor(fields[field] ?? "string")[0], value: "" });
                }}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(fields).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={item.operator}
                onValueChange={(operator) => update(index, { operator: operator as AutomationConditionOperator })}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operatorsFor(fields[item.field] ?? "string").map((op) => (
                    <SelectItem key={op} value={op}>
                      {OPERATOR_LABEL[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {item.operator !== "EXISTS" && item.operator !== "DOES_NOT_EXIST" && (
                <Input
                  className="h-8 flex-1 text-xs"
                  value={String(item.value ?? "")}
                  onChange={(e) => update(index, { value: e.target.value })}
                  placeholder="Value"
                />
              )}
              <Button variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={addFieldCondition} className="gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Field condition
        </Button>
        {activityCapable && (
          <>
            <Button variant="outline" size="sm" onClick={() => addNoReplyCondition("EMAIL")} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              No email reply
            </Button>
            <Button variant="outline" size="sm" onClick={() => addNoReplyCondition("MESSAGE")} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              No message reply
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
