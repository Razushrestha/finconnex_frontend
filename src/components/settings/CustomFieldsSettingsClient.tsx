"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CUSTOM_FIELD_ENTITY_TYPES,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDef,
  type CustomFieldEntity,
  type CustomFieldType,
} from "@/lib/custom-fields/types";
import {
  listCustomFields,
  saveCustomFields,
  upsertCustomField,
} from "@/lib/custom-fields/store";
import { newRulesId } from "@/lib/rules/storage";
import { cn } from "@/lib/utils";

export function CustomFieldsSettingsClient() {
  const [fields, setFields] = useState<CustomFieldDef[]>(() =>
    listCustomFields(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] =
    useState<CustomFieldEntity | "All">("Lead");

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function refresh() {
    setFields(listCustomFields());
  }

  function toggleActive(id: string) {
    const row = fields.find((f) => f.id === id);
    if (!row) return;
    upsertCustomField({ ...row, active: !row.active });
    refresh();
    flash(row.active ? "Field deactivated" : "Field activated");
  }

  function addField() {
    const keyBase = `field${fields.length + 1}`;
    const def: CustomFieldDef = {
      id: newRulesId("cf"),
      entity: entityFilter === "All" ? "Lead" : entityFilter,
      key: keyBase,
      label: "New field",
      type: "text",
      active: true,
    };
    upsertCustomField(def);
    refresh();
    flash("Custom field added");
  }

  function updateField(id: string, patch: Partial<CustomFieldDef>) {
    const row = fields.find((f) => f.id === id);
    if (!row) return;
    const next = { ...row, ...patch };
    if (patch.key) {
      next.key = patch.key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || row.key;
    }
    upsertCustomField(next);
    refresh();
  }

  function removeField(id: string) {
    saveCustomFields(fields.filter((f) => f.id !== id));
    refresh();
    flash("Field removed");
  }

  const visible =
    entityFilter === "All"
      ? fields
      : fields.filter((f) => f.entity === entityFilter);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              Custom Fields
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              Define tenant fields for Leads (and other entities). Active Lead
              fields appear in the{" "}
              <Link
                href="/settings/crm-configuration/lead-card"
                className="font-medium text-violet-600 hover:underline"
              >
                Lead Card
              </Link>{" "}
              picker as <code className="rounded bg-slate-100 px-1">cf:*</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={addField}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            Add field
          </button>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CUSTOM_FIELD_ENTITY_TYPES] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEntityFilter(e)}
              className={cn(
                "h-8 rounded-lg px-2.5 text-[11px] font-semibold",
                entityFilter === e
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {e}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {visible.map((field) => (
            <li
              key={field.id}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-[11px] font-medium text-slate-600">
                  Label
                  <input
                    value={field.label}
                    onChange={(e) =>
                      updateField(field.id, { label: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </label>
                <label className="text-[11px] font-medium text-slate-600">
                  Key
                  <input
                    value={field.key}
                    onChange={(e) =>
                      updateField(field.id, { key: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 font-mono text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </label>
                <label className="text-[11px] font-medium text-slate-600">
                  Entity
                  <select
                    value={field.entity}
                    onChange={(e) =>
                      updateField(field.id, {
                        entity: e.target.value as CustomFieldEntity,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {CUSTOM_FIELD_ENTITY_TYPES.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-medium text-slate-600">
                  Type
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(field.id, {
                        type: e.target.value as CustomFieldType,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {CUSTOM_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  Card key:{" "}
                  <code className="rounded bg-white px-1">cf:{field.key}</code>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.active}
                    onClick={() => toggleActive(field.id)}
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      field.active ? "bg-violet-600" : "bg-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        field.active && "translate-x-4",
                      )}
                    />
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {field.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="text-[11px] font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-[12px] text-slate-400">
              No custom fields for this filter
            </li>
          )}
        </ul>
      </div>

      {toast && (
        <div
          className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
