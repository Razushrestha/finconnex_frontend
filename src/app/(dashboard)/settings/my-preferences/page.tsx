"use client";

import { useMemo, useState } from "react";
import { MY_PREFERENCES_TABS } from "@/lib/settings/settings-config";
import { SettingsFormClient } from "@/components/settings/SettingsFormClient";
import { cn } from "@/lib/utils";

/** SRS Top Right: My Preferences (profile, signature, password, notifications, theme). */
export default function MyPreferencesPage() {
  const [tab, setTab] = useState<(typeof MY_PREFERENCES_TABS)[number]["slug"]>(
    "profile",
  );
  const active = useMemo(
    () => MY_PREFERENCES_TABS.find((t) => t.slug === tab) ?? MY_PREFERENCES_TABS[0],
    [tab],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
          Top right · My Preferences
        </p>
        <h2 className="text-[17px] font-bold text-slate-900">My Preferences</h2>
        <p className="mt-1 text-[12px] text-slate-500">
          Profile, signature, password, notifications, and theme: personal
          overrides that do not change tenant-wide Settings.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {MY_PREFERENCES_TABS.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setTab(t.slug)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold",
              tab === t.slug
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {t.title}
          </button>
        ))}
      </div>

      <SettingsFormClient
        key={active.slug}
        categorySlug="my-preferences"
        subpageSlug={active.slug}
        path={`/settings/my-preferences#${active.slug}`}
      />
    </div>
  );
}
