"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  persistRemoteNotificationPreferences,
  tryCrmNotificationPreferences,
  updateCrmNotificationPreferences,
} from "@/lib/notification-preferences/api";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notification-preferences/store";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationDigest,
  type NotificationPreferences,
} from "@/lib/notification-preferences/types";
import { useCrmNotificationPreferences } from "@/lib/notification-preferences/use-crm-notification-preferences";
import { cn } from "@/lib/utils";

const DIGEST_OPTIONS: { label: string; value: NotificationDigest }[] = [
  { label: "Real-time", value: "realtime" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Off", value: "off" },
];

export function NotificationPreferencesClient({
  title = "Notification preferences",
  description = "Channel defaults and the FCM device token for this user.",
  moduleHref,
  moduleLabel,
}: {
  title?: string;
  description?: string;
  moduleHref?: string;
  moduleLabel?: string;
}) {
  const crm = useCrmNotificationPreferences();
  const [values, setValues] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (crm.loading) return;
    setValues(crm.prefs ?? loadNotificationPreferences());
  }, [crm.loading, crm.prefs, crm.source]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function setField<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onCancel() {
    setValues(crm.prefs ?? loadNotificationPreferences());
    flash("Reverted to last saved");
  }

  async function onSave() {
    setSaving(true);
    saveNotificationPreferences(values);
    const remote = await tryCrmNotificationPreferences(() =>
      updateCrmNotificationPreferences(values),
    );
    if (remote) {
      persistRemoteNotificationPreferences(remote);
      setValues(remote);
      crm.setPrefs(remote);
      flash("Saved to CRM");
    } else {
      flash(crm.source === "api" ? "CRM save failed — kept locally" : "Saved");
    }
    setSaving(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              {description}
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
            {crm.error && crm.source === "demo" ? (
              <p className="mt-1 text-[11px] text-slate-400">{crm.error}</p>
            ) : null}
          </div>
          {moduleHref ? (
            <Link
              href={moduleHref}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {moduleLabel || "Open module"}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:p-6 xl:grid-cols-2">
        <ToggleRow
          label="Email notifications"
          on={values.emailEnabled}
          onChange={(on) => setField("emailEnabled", on)}
        />
        <ToggleRow
          label="SMS notifications"
          on={values.smsEnabled}
          onChange={(on) => setField("smsEnabled", on)}
        />
        <ToggleRow
          label="Push notifications"
          on={values.pushEnabled}
          onChange={(on) => setField("pushEnabled", on)}
        />
        <ToggleRow
          label="In-app notifications"
          on={values.inAppEnabled}
          onChange={(on) => setField("inAppEnabled", on)}
        />
        <ToggleRow
          label="Email me for @mentions"
          on={values.emailMentions}
          onChange={(on) => setField("emailMentions", on)}
        />
        <ToggleRow
          label="In-app for @mentions"
          on={values.inAppMentions}
          onChange={(on) => setField("inAppMentions", on)}
        />
        <ToggleRow
          label="Notify when a task is assigned to me"
          on={values.taskAssigned}
          onChange={(on) => setField("taskAssigned", on)}
        />
        <label className="space-y-1.5">
          <span className="text-[12px] font-semibold text-slate-700">
            Personal digest
          </span>
          <select
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400"
            value={values.digest}
            onChange={(e) =>
              setField("digest", e.target.value as NotificationDigest)
            }
          >
            {DIGEST_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 xl:col-span-2">
          <span className="text-[12px] font-semibold text-slate-700">
            FCM device token
          </span>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-400"
            value={values.fcmToken}
            onChange={(e) => setField("fcmToken", e.target.value)}
            placeholder="Optional Firebase Cloud Messaging token"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
      <p className="text-[12px] font-semibold text-slate-800">{label}</p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-violet-600" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
