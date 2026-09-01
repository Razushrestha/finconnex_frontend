"use client";

import { useEffect, useState } from "react";
import {
  patchCrmWorkspaceSettings,
  tryCrmSettings,
} from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import { cn } from "@/lib/utils";

const MODULES = [
  { key: "leads", flag: "enableLeads", label: "Leads" },
  { key: "deals", flag: "enableDeals", label: "Deals" },
  { key: "projects", flag: "enableProjects", label: "Projects" },
  { key: "posts", flag: "enablePosts", label: "Posts" },
] as const;

type Flag = (typeof MODULES)[number]["flag"];

/** Settings → System → Enable/Disable Modules (`GET /v1/settings/capabilities`). */
export function CapabilitiesSettingsClient() {
  const crm = useCrmSettings();
  const [flags, setFlags] = useState<Record<Flag, boolean>>({
    enableLeads: true,
    enableDeals: true,
    enableProjects: true,
    enablePosts: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (crm.settings) {
      setFlags({
        enableLeads: crm.settings.enableLeads ?? true,
        enableDeals: crm.settings.enableDeals ?? true,
        enableProjects: crm.settings.enableProjects ?? true,
        enablePosts: crm.settings.enablePosts ?? false,
      });
      return;
    }
    if (crm.capabilities) {
      const enabled = new Set(crm.capabilities.enabled.map((m) => m.toLowerCase()));
      setFlags({
        enableLeads: enabled.has("leads"),
        enableDeals: enabled.has("deals"),
        enableProjects: enabled.has("projects"),
        enablePosts: enabled.has("posts"),
      });
    }
  }, [crm.settings, crm.capabilities]);

  async function save() {
    setSaving(true);
    const patched = await tryCrmSettings(() =>
      patchCrmWorkspaceSettings({
        ...flags,
        expectedRevision: crm.settings?.revision,
      }),
    );
    setSaving(false);
    if (patched) {
      crm.setSettings(patched);
      setMessage("Modules saved to CRM");
    } else {
      setMessage("Saved locally — sign in to sync modules");
    }
    window.setTimeout(() => setMessage(null), 2800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">
              Enable / disable modules
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Workspace capabilities from GET /v1/settings/capabilities.
            </p>
          </div>
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
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
        {crm.error && crm.source === "demo" ? (
          <p className="mt-2 text-[12px] text-slate-500">{crm.error}</p>
        ) : null}
      </div>
      <div className="divide-y divide-slate-100">
        {MODULES.map((mod) => (
          <label
            key={mod.key}
            className="flex items-center justify-between gap-3 px-5 py-3.5"
          >
            <span className="text-[13px] font-semibold text-slate-800">
              {mod.label}
            </span>
            <input
              type="checkbox"
              checked={flags[mod.flag]}
              onChange={(e) =>
                setFlags((prev) => ({ ...prev, [mod.flag]: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-violet-600"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save modules"}
        </button>
      </div>
    </div>
  );
}
