"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import {
  loadIpAllowlist,
  saveIpAllowlist,
  type IpAllowlistConfig,
} from "@/lib/settings/ip-allowlist";
import {
  patchCrmWorkspaceSettings,
  tryCrmSettings,
} from "@/lib/settings/api";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import { cn } from "@/lib/utils";

/** Settings → Security → IP Restrictions */
export function IpRestrictionsSettingsClient() {
  const crm = useCrmSettings();
  const [cfg, setCfg] = useState<IpAllowlistConfig>(() => loadIpAllowlist());
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = loadIpAllowlist();
    const entries =
      crm.security?.ipAllowlist?.length
        ? crm.security.ipAllowlist
        : crm.settings?.ipAllowlist?.length
          ? crm.settings.ipAllowlist
          : next.entries;
    const enabled = entries.length > 0 ? next.enabled || Boolean(crm.security) : next.enabled;
    setCfg({ ...next, entries, enabled });
    setText(entries.join("\n"));
  }, [crm.security, crm.settings]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2600);
  }

  function persist(nextEntries?: string[], enabled?: boolean) {
    const entries =
      nextEntries ??
      text
        .split(/[\n,]+/)
        .map((e) => e.trim())
        .filter(Boolean);
    const saved = saveIpAllowlist({
      enabled: enabled ?? cfg.enabled,
      entries,
    });
    setCfg(saved);
    setText(saved.entries.join("\n"));
    if (crm.source === "api") {
      void tryCrmSettings(() =>
        patchCrmWorkspaceSettings({
          ipAllowlist: saved.enabled ? saved.entries : [],
          expectedRevision: crm.settings?.revision,
        }),
      );
    }
    flash(
      saved.enabled
        ? "IP allowlist on — next login checks cookie"
        : "IP allowlist off",
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">
          IP restrictions
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Workspace IP allow-list from GET /v1/settings/security. Empty list
          permits all addresses.
        </p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
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
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-600" />
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                {cfg.enabled ? "Allowlist is on" : "Allowlist is off"}
              </p>
              <p className="text-[11px] text-slate-500">
                Keep 127.0.0.1 / ::1 / localhost for local demo login
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => persist(undefined, !cfg.enabled)}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            {cfg.enabled ? "Disable" : "Enable"}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">
            Allowed IPs (one per line)
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px] text-slate-800 outline-none focus:border-violet-400"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => persist()}
            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            Save list
          </button>
          <button
            type="button"
            onClick={() => {
              const next = Array.from(
                new Set([...cfg.entries, "127.0.0.1", "::1", "localhost"]),
              );
              persist(next, true);
            }}
            className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
          >
            Allow this machine
          </button>
        </div>
      </div>
    </div>
  );
}
