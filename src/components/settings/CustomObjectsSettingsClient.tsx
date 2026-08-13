"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createCustomObject,
  deleteCustomObject,
  listCustomObjects,
  updateCustomObject,
  type CustomObjectDef,
} from "@/lib/settings/custom-objects-store";

/** Settings → CRM Configuration → Custom Objects */
export function CustomObjectsSettingsClient() {
  const [rows, setRows] = useState<CustomObjectDef[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: "",
    pluralLabel: "",
    apiName: "",
    description: "",
  });

  function refresh() {
    setRows(listCustomObjects());
  }

  useEffect(() => {
    refresh();
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">Custom objects</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Demo module definitions (Property, Referral Partner, …). Production
          would register schemas + layouts on the CRM API.
        </p>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>

      <div className="space-y-3 border-b border-slate-100 px-5 py-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          New object
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={draft.label}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                label: e.target.value,
                apiName: d.apiName || e.target.value.replace(/\s+/g, ""),
                pluralLabel: d.pluralLabel || `${e.target.value}s`,
              }))
            }
            placeholder="Label"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
          <input
            value={draft.pluralLabel}
            onChange={(e) =>
              setDraft((d) => ({ ...d, pluralLabel: e.target.value }))
            }
            placeholder="Plural label"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
          <input
            value={draft.apiName}
            onChange={(e) =>
              setDraft((d) => ({ ...d, apiName: e.target.value }))
            }
            placeholder="API name"
            className="h-9 rounded-lg border border-slate-200 px-3 font-mono text-[12px] outline-none focus:border-violet-400"
          />
          <input
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
            placeholder="Description"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!draft.label.trim()) {
              flash("Label required");
              return;
            }
            createCustomObject(draft);
            setDraft({
              label: "",
              pluralLabel: "",
              apiName: "",
              description: "",
            });
            refresh();
            flash("Custom object created");
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Create object
        </button>
      </div>

      <ul className="divide-y divide-slate-50">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                {r.label}{" "}
                <span className="font-mono text-[10px] font-normal text-slate-400">
                  {r.apiName}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                {r.pluralLabel}
                {r.description ? ` · ${r.description}` : ""} · {r.fieldCount}{" "}
                fields
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateCustomObject(r.id, { active: !r.active });
                  refresh();
                  flash(r.active ? "Deactivated" : "Activated");
                }}
                className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
              >
                {r.active ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                aria-label={`Delete ${r.label}`}
                onClick={() => {
                  deleteCustomObject(r.id);
                  refresh();
                  flash("Object removed");
                }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
