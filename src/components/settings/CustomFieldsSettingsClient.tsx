"use client";

import { useEffect, useRef, useState } from "react";
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
  onCustomFieldsChange,
  saveCustomFields,
  upsertCustomField,
} from "@/lib/custom-fields/store";
import {
  createCrmCustomField,
  deleteCrmCustomField,
  exportCrmCustomFieldDefinitions,
  getCrmCustomFieldUsage,
  importCrmCustomFields,
  previewCrmCustomField,
  reorderCrmCustomFields,
  toCustomFieldBody,
  tryCrmCustomField,
  updateCrmCustomField,
} from "@/lib/custom-fields/api";
import { useCrmCustomFields } from "@/lib/custom-fields/use-crm-custom-fields";
import { newRulesId } from "@/lib/rules/storage";
import { cn } from "@/lib/utils";

export function CustomFieldsSettingsClient() {
  const crm = useCrmCustomFields();
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] =
    useState<CustomFieldEntity | "All">("Lead");
  const [busy, setBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const patchTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (crm.loading) return;
    setFields(listCustomFields());
  }, [crm.source, crm.loading]);

  useEffect(() => {
    return onCustomFieldsChange(() => setFields(listCustomFields()));
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function refreshLocal() {
    setFields(listCustomFields());
  }

  async function toggleActive(id: string) {
    const row = fields.find((f) => f.id === id);
    if (!row || busy) return;
    const next = { ...row, active: !row.active };
    upsertCustomField(next);
    refreshLocal();
    if (crm.source === "api") {
      try {
        const remote = await updateCrmCustomField(id, toCustomFieldBody(next));
        if (remote) upsertCustomField(remote);
        refreshLocal();
      } catch (err) {
        flash(err instanceof Error ? err.message : "Update failed");
        return;
      }
    }
    flash(row.active ? "Field deactivated" : "Field activated");
  }

  async function addField() {
    if (busy) return;
    const keyBase = `field${fields.length + 1}`;
    const draft: CustomFieldDef = {
      id: newRulesId("cf"),
      entity: entityFilter === "All" ? "Lead" : entityFilter,
      key: keyBase,
      label: "New field",
      type: "text",
      active: true,
    };
    setBusy(true);
    try {
      if (crm.source === "api") {
        await tryCrmCustomField(() =>
          previewCrmCustomField(toCustomFieldBody(draft)),
        );
        const remote = await createCrmCustomField(toCustomFieldBody(draft));
        if (remote) {
          upsertCustomField(remote);
          refreshLocal();
          flash("Custom field added");
          return;
        }
      }
      upsertCustomField(draft);
      refreshLocal();
      flash(
        crm.source === "api"
          ? "CRM create failed — saved locally"
          : "Custom field added",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  function updateField(id: string, patch: Partial<CustomFieldDef>) {
    const row = fields.find((f) => f.id === id);
    if (!row) return;
    const next = { ...row, ...patch };
    if (patch.key) {
      next.key = patch.key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || row.key;
    }
    upsertCustomField(next);
    refreshLocal();
    if (crm.source !== "api") return;
    window.clearTimeout(patchTimers.current[id]);
    patchTimers.current[id] = window.setTimeout(() => {
      void updateCrmCustomField(id, toCustomFieldBody(next)).then((remote) => {
        if (remote) {
          upsertCustomField(remote);
          refreshLocal();
        }
      }).catch((err) => {
        flash(err instanceof Error ? err.message : "Update failed");
      });
    }, 500);
  }

  async function removeField(id: string) {
    if (busy) return;
    if (crm.source === "api") {
      try {
        await deleteCrmCustomField(id);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Delete failed");
        return;
      }
    }
    saveCustomFields(fields.filter((f) => f.id !== id));
    refreshLocal();
    flash("Field removed");
  }

  async function moveField(id: string, delta: -1 | 1) {
    const index = fields.findIndex((f) => f.id === id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= fields.length) return;
    const next = [...fields];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    saveCustomFields(next);
    refreshLocal();
    if (crm.source === "api") {
      try {
        await reorderCrmCustomFields(next.map((f) => f.id));
      } catch (err) {
        flash(err instanceof Error ? err.message : "Reorder failed");
      }
    }
  }

  async function onExport() {
    try {
      const data =
        crm.source === "api"
          ? await exportCrmCustomFieldDefinitions()
          : fields;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "custom-fields.json";
      a.click();
      URL.revokeObjectURL(url);
      flash("Definitions exported");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function onImport(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (crm.source === "api") {
        await importCrmCustomFields({
          definitions: parsed,
          items: parsed,
          dryRun: false,
        });
        crm.refresh();
      } else if (Array.isArray(parsed)) {
        saveCustomFields(parsed as CustomFieldDef[]);
        refreshLocal();
      }
      flash("Import queued");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function onUsage(id: string) {
    try {
      const usage = await getCrmCustomFieldUsage(id);
      flash(
        usage
          ? `Usage: ${JSON.stringify(usage).slice(0, 80)}`
          : "No usage returned",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Usage lookup failed");
    }
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
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
                Custom Fields
              </h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  crm.source === "api"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {crm.source === "api"
                  ? "Live CRM"
                  : crm.loading
                    ? "Connecting…"
                    : "Demo"}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              Definitions from GET /v1/custom-fields. Active Lead fields appear
              in the{" "}
              <Link
                href="/settings/crm-configuration/lead-card"
                className="font-medium text-violet-600 hover:underline"
              >
                Lead Card
              </Link>{" "}
              picker as <code className="rounded bg-slate-100 px-1">cf:*</code>.
            </p>
            {crm.error && crm.source === "demo" ? (
              <p className="mt-1 text-[11px] text-slate-400">{crm.error}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onExport()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onImport(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void addField()}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Add field
            </button>
          </div>
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
                    onClick={() => void moveField(field.id, -1)}
                    className="text-[11px] font-medium text-slate-500 hover:underline"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveField(field.id, 1)}
                    className="text-[11px] font-medium text-slate-500 hover:underline"
                  >
                    Down
                  </button>
                  {crm.source === "api" ? (
                    <button
                      type="button"
                      onClick={() => void onUsage(field.id)}
                      className="text-[11px] font-medium text-slate-500 hover:underline"
                    >
                      Usage
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.active}
                    onClick={() => void toggleActive(field.id)}
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
                    onClick={() => void removeField(field.id)}
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
              {crm.loading
                ? "Loading custom fields…"
                : "No custom fields for this filter"}
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
