"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SettingsCrmBadge } from "@/components/settings/SettingsCrmBadge";
import type { CrmPicklistSpec } from "@/lib/settings/crm-picklists";
import {
  overlayCatalogValues,
  saveCrmSettingsFormPage,
} from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import {
  loadSettingsValues,
  saveSettingsValues,
  type SettingsValues,
} from "@/lib/settings/settings-store";
import { notify } from "@/lib/notify/toast";

export function CrmPicklistSettingsClient({
  spec,
  pageKey,
}: {
  spec: CrmPicklistSpec;
  pageKey: string;
}) {
  const crm = useCrmSettings();
  const [preferredDefault, setPreferredDefault] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const local = loadSettingsValues(pageKey);
    let next: SettingsValues = {
      preferredDefault: "",
      notes: "",
      ...local,
    };
    if (crm.settings) {
      next = overlayCatalogValues(next, crm.settings, pageKey);
    }
    setPreferredDefault(String(next.preferredDefault ?? ""));
    setNotes(String(next.notes ?? ""));
  }, [pageKey, crm.settings]);

  async function onSave() {
    const values: SettingsValues = { preferredDefault, notes };
    setSaving(true);
    saveSettingsValues(pageKey, values, { path: `/settings/${pageKey}`, title: spec.title });
    const [category, subpage] = pageKey.split("/");
    try {
      if (crm.source === "api" && category && subpage) {
        const patched = await saveCrmSettingsFormPage(
          category,
          subpage,
          values,
          crm.settings?.revision,
        );
        crm.setSettings(patched);
        notify("Saved to CRM");
      } else {
        notify("Saved on this device");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save");
    }
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {spec.title}
            </h2>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-slate-500">
              {spec.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SettingsCrmBadge />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {spec.nestEnum}
              </span>
            </div>
          </div>
          {spec.moduleHref ? (
            <Link
              href={spec.moduleHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {spec.moduleLabel || "Open module"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <p className="mb-3 text-[11px] text-slate-400">
          Used on {spec.appliesTo}. The list is defined in CRM. Prefer a default
          and notes below — those save on this workspace.
        </p>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {spec.values.map((row) => (
            <li
              key={row.code}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="text-[13px] font-medium text-slate-800">
                {row.label}
              </span>
              <code className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                {row.code}
              </code>
            </li>
          ))}
        </ul>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-slate-700">
              Preferred default
            </span>
            <select
              value={preferredDefault}
              onChange={(e) => setPreferredDefault(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400"
            >
              <option value="">No preference</option>
              {spec.values.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <label className="xl:col-span-2 block space-y-1.5">
            <span className="text-[12px] font-semibold text-slate-700">
              Workspace notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={`How this team uses ${spec.title.toLowerCase()}…`}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-violet-400"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
