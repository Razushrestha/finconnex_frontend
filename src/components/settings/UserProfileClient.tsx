"use client";

import { useEffect, useState } from "react";
import {
  persistRemoteUserProfile,
  tryCrmUserProfile,
  updateCrmUserProfile,
} from "@/lib/user-profile/api";
import { loadUserProfile, saveUserProfile } from "@/lib/user-profile/types";
import { useCrmUserProfile } from "@/lib/user-profile/use-crm-user-profile";
import { cn } from "@/lib/utils";

export function UserProfileClient() {
  const crm = useCrmUserProfile();
  const [values, setValues] = useState(loadUserProfile());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (crm.loading) return;
    setValues(crm.profile ?? loadUserProfile());
  }, [crm.loading, crm.profile, crm.source]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function onCancel() {
    setValues(crm.profile ?? loadUserProfile());
    flash("Reverted to last saved");
  }

  async function onSave() {
    setSaving(true);
    saveUserProfile(values);
    const remote = await tryCrmUserProfile(() => updateCrmUserProfile(values));
    if (remote) {
      persistRemoteUserProfile(remote);
      setValues(remote);
      crm.setProfile(remote);
      flash("Saved to CRM");
    } else {
      flash(crm.source === "api" ? "Saved locally — CRM update failed" : "Saved locally");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">Profile</h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Display name, contact details, and job title from your CRM user record.
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
          {crm.source === "api" ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
        </span>
      </div>

      {crm.error && crm.source !== "api" ? (
        <p className="mb-3 text-[12px] text-amber-700">{crm.error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px] font-medium text-slate-700">
          First name
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.firstName}
            onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700">
          Last name
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.lastName}
            onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700">
          Username
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.userName}
            onChange={(e) => setValues((v) => ({ ...v, userName: e.target.value }))}
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700">
          Email
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-500"
            value={values.email}
            readOnly
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700">
          Phone
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700">
          Job title
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.jobTitle}
            onChange={(e) => setValues((v) => ({ ...v, jobTitle: e.target.value }))}
          />
        </label>
        <label className="block text-[12px] font-medium text-slate-700 sm:col-span-2">
          Avatar URL
          <input
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-violet-400"
            value={values.avatar}
            onChange={(e) => setValues((v) => ({ ...v, avatar: e.target.value }))}
            placeholder="https://…"
          />
        </label>
      </div>

      {toast ? (
        <p className="mt-3 text-[12px] font-medium text-emerald-700">{toast}</p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="inline-flex h-9 items-center rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
