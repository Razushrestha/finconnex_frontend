"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  LEAD_CARD_SETTINGS_PATH,
  MAX_DYNAMIC_FIELDS,
  listLeadCardFieldOptions,
  loadLeadCardSettings,
  saveLeadCardSettings,
  type LeadCardFieldKey,
  type LeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import { onCustomFieldsChange } from "@/lib/custom-fields/store";
import { cn } from "@/lib/utils";

export function LeadCardSettingsClient() {
  const [settings, setSettings] = useState<LeadCardSettings>(() =>
    loadLeadCardSettings(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [fieldOptionsTick, setFieldOptionsTick] = useState(0);

  useEffect(() => {
    return onCustomFieldsChange(() => {
      setFieldOptionsTick((n) => n + 1);
    });
  }, []);

  const fieldOptions = useMemo(() => {
    void fieldOptionsTick;
    return listLeadCardFieldOptions();
  }, [fieldOptionsTick]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function toggleField(key: LeadCardFieldKey) {
    setSettings((prev) => {
      const has = prev.dynamicFieldKeys.includes(key);
      if (has) {
        return {
          ...prev,
          dynamicFieldKeys: prev.dynamicFieldKeys.filter((k) => k !== key),
        };
      }
      if (prev.dynamicFieldKeys.length >= MAX_DYNAMIC_FIELDS) {
        flash(`Max ${MAX_DYNAMIC_FIELDS} fields on the card`);
        return prev;
      }
      return {
        ...prev,
        dynamicFieldKeys: [...prev.dynamicFieldKeys, key],
      };
    });
  }

  function onCancel() {
    setSettings(loadLeadCardSettings());
    flash("Reverted to last saved");
  }

  function onSave() {
    const saved = saveLeadCardSettings(settings);
    setSettings(saved);
    flash("Saved — leads board will refresh");
  }

  const atCap = settings.dynamicFieldKeys.length >= MAX_DYNAMIC_FIELDS;
  const builtin = fieldOptions.filter((f) => f.group === "builtin");
  const custom = fieldOptions.filter((f) => f.group === "custom");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              Lead Card
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
              Admin layout for Sales → Leads. Pick up to {MAX_DYNAMIC_FIELDS}{" "}
              fields from Lead Details or Custom Fields. Locked defaults: owner
              avatar off, unreplied threshold 24h, Note/Attachment stay
              neutral (no escalation/push from the card).
            </p>
          </div>
          <Link
            href="/sales/leads"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Leads board
          </Link>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-slate-800">
              Show owner avatar
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Small initials (~20px). Hover/focus reveals the full name.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showOwnerAvatar}
            aria-label="Show owner avatar on lead cards"
            onClick={() =>
              setSettings((s) => ({
                ...s,
                showOwnerAvatar: !s.showOwnerAvatar,
              }))
            }
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
              settings.showOwnerAvatar ? "bg-violet-600" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                settings.showOwnerAvatar && "translate-x-5",
              )}
            />
          </button>
        </div>

        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-800">
            Dynamic information fields
          </legend>
          <p className="mt-1 text-[11px] text-slate-400">
            Select up to {MAX_DYNAMIC_FIELDS}. Selected:{" "}
            <span className="font-semibold text-slate-600">
              {settings.dynamicFieldKeys.length}/{MAX_DYNAMIC_FIELDS}
            </span>
            {atCap ? " — limit reached" : ""}
          </p>

          <p className="mt-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Built-in
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {builtin.map((field) => {
              const checked = settings.dynamicFieldKeys.includes(field.key);
              const disabled = !checked && atCap;
              return (
                <li key={field.key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] transition-colors",
                      checked
                        ? "border-violet-300 bg-violet-50/60 text-slate-800"
                        : "border-slate-200 bg-white text-slate-700",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleField(field.key)}
                    />
                    <span className="font-medium">{field.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Custom fields
            </p>
            <Link
              href="/settings/crm-configuration/custom-fields"
              className="text-[11px] font-medium text-violet-600 hover:underline"
            >
              Manage in Settings
            </Link>
          </div>
          {custom.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-[11px] text-slate-500">
              No active Lead custom fields yet. Add them under CRM Configuration
              → Custom Fields.
            </p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {custom.map((field) => {
                const checked = settings.dynamicFieldKeys.includes(field.key);
                const disabled = !checked && atCap;
                return (
                  <li key={field.key}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] transition-colors",
                        checked
                          ? "border-violet-300 bg-violet-50/60 text-slate-800"
                          : "border-slate-200 bg-white text-slate-700",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleField(field.key)}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{field.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                          {field.key}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-[12px] font-semibold text-slate-700">
            Unreplied SMS / email threshold (hours)
          </span>
          <input
            type="number"
            min={1}
            max={168}
            value={settings.unrepliedThresholdHours}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                unrepliedThresholdHours: Number(e.target.value) || 24,
              }))
            }
            className="h-10 w-full max-w-[12rem] rounded-xl border border-slate-200 px-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-violet-300"
          />
          <span className="block text-[11px] text-slate-400">
            Default 24h. Past this age, unreplied inbound messages count as
            broken (red) on the card.
          </span>
        </label>

        <p className="text-[11px] text-slate-400">
          Settings path:{" "}
          <code className="rounded bg-slate-100 px-1">{LEAD_CARD_SETTINGS_PATH}</code>
        </p>
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
          onClick={onSave}
          className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
        >
          Save changes
        </button>
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
