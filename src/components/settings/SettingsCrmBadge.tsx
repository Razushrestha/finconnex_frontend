"use client";

import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import { cn } from "@/lib/utils";

export function SettingsCrmBadge() {
  const crm = useCrmSettings();
  return (
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
  );
}
