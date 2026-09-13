"use client";

/**
 * "Fields to Update" as a list of field/value rows instead of a JSON box.
 *
 * The executor runs the saved object through pickAllowed() against the
 * entity's MUTABLE_*_FIELDS set, so a key it does not recognise is dropped
 * without an error — the step reports success and the record is unchanged.
 * Typing that object by hand made a silent no-op easy to write and hard to
 * notice; picking from the list makes it impossible.
 *
 * Keys already saved that this build cannot offer (an entity with no list, or
 * something written through the API) are kept and shown read-only rather than
 * dropped, so opening a step never discards someone else's configuration.
 */

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
import type { WorkspaceMember } from "@/lib/workspace-members/types";
import type { AutomationEntityType } from "@/lib/automations/types";
import {
  unknownFieldKeys,
  updatableFields,
  type UpdatableField,
} from "@/lib/automations/updatable-fields";

import { MemberSelect } from "./MemberSelect";

export function FieldsEditor({
  entityType,
  value,
  onChange,
  members,
  membersStatus,
}: {
  entityType: AutomationEntityType;
  value: unknown;
  onChange: (fields: Record<string, unknown> | undefined) => void;
  members: WorkspaceMember[];
  membersStatus: "loading" | "ready" | "error";
}) {
  const fields =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const catalog = updatableFields(entityType);
  const chosen = Object.keys(fields).filter((key) => key in catalog);
  const unknown = unknownFieldKeys(entityType, fields);
  const available = Object.keys(catalog).filter((key) => !(key in fields));

  function write(next: Record<string, unknown>) {
    onChange(Object.keys(next).length ? next : undefined);
  }

  function setValue(key: string, next: unknown) {
    write({ ...fields, [key]: next });
  }

  function remove(key: string) {
    const next = { ...fields };
    delete next[key];
    write(next);
  }

  function rename(from: string, to: string) {
    // Preserve row order: rebuild rather than delete-then-append.
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(fields)) {
      if (key === from) next[to] = defaultFor(catalog[to]);
      else next[key] = item;
    }
    write(next);
  }

  if (Object.keys(catalog).length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500">
        This trigger&apos;s record type has no updatable fields — the executor
        only updates leads, contacts, organizations and deals.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {chosen.length === 0 && unknown.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-400">
          No fields yet. Add the ones this step should change.
        </p>
      )}

      {chosen.map((key) => {
        const meta = catalog[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <Select
              items={[...Object.entries(catalog)].map(([k, m]) => ({
                label: m.label,
                value: k,
              }))}
              value={key}
              onValueChange={(next) => next && next !== key && rename(key, next)}
            >
              <SelectTrigger className="h-8 w-[40%] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(catalog).map(([k, m]) => (
                  <SelectItem key={k} value={k} disabled={k !== key && k in fields}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1">
              <FieldValue
                meta={meta}
                value={fields[key]}
                onChange={(next) => setValue(key, next)}
                members={members}
                membersStatus={membersStatus}
              />
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${meta.label}`}
              onClick={() => remove(key)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      {unknown.map((key) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5"
        >
          <span className="w-[40%] truncate text-xs font-medium text-amber-800">
            {key}
          </span>
          <span className="flex-1 truncate text-xs text-amber-700">
            {String(fields[key] ?? "")}
          </span>
          <span className="text-[11px] text-amber-600">
            not updatable for this record
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${key}`}
            onClick={() => remove(key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {available.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => setValue(available[0], defaultFor(catalog[available[0]]))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      )}
    </div>
  );
}

/** A new row starts empty rather than guessing a value nobody asked for. */
function defaultFor(meta?: UpdatableField): unknown {
  return meta?.widget === "boolean" ? false : "";
}

function FieldValue({
  meta,
  value,
  onChange,
  members,
  membersStatus,
}: {
  meta: UpdatableField;
  value: unknown;
  onChange: (next: unknown) => void;
  members: WorkspaceMember[];
  membersStatus: "loading" | "ready" | "error";
}) {
  if (meta.widget === "member") {
    return (
      <MemberSelect
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        members={members}
        membersStatus={membersStatus}
      />
    );
  }

  if (meta.widget === "select") {
    const options = meta.options ?? [];
    return (
      <Select
        items={options}
        value={typeof value === "string" && value ? value : null}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (meta.widget === "boolean") {
    return (
      <label className="flex h-8 items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {value === true ? "Yes" : "No"}
      </label>
    );
  }

  if (meta.widget === "number") {
    return (
      <Input
        type="number"
        className="h-8 text-xs"
        value={typeof value === "number" ? value : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }

  if (meta.widget === "date") {
    return (
      <Input
        type="date"
        className="h-8 text-xs"
        value={typeof value === "string" ? value.slice(0, 10) : ""}
        onChange={(e) =>
          onChange(
            e.target.value ? new Date(e.target.value).toISOString() : "",
          )
        }
      />
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={meta.helpText}
    />
  );
}
