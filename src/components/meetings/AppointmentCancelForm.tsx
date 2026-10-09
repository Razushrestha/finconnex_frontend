"use client";

import { useEffect, useState } from "react";
import type { AppointmentManageRecord } from "@/lib/meetings/appointment-manage";

export function AppointmentCancelForm({ token }: { token: string }) {
  const [record, setRecord] = useState<AppointmentManageRecord | null | undefined>(undefined);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [kept, setKept] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/appointment/manage/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("missing");
        return (await res.json()) as AppointmentManageRecord;
      })
      .then((next) => {
        if (!cancelled) setRecord(next);
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit() {
    if (!remarks.trim()) {
      setError("Remarks are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/appointment/manage/${encodeURIComponent(token)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: remarks.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not cancel this appointment.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this appointment.");
    } finally {
      setSaving(false);
    }
  }

  if (record === undefined) {
    return <p className="p-8 text-center text-sm text-slate-500">Loading appointment…</p>;
  }
  if (!record) {
    return <p className="p-8 text-center text-sm text-slate-500">This appointment link is not valid.</p>;
  }
  if (record.status === "deleted") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Appointment deleted</h1>
        <p className="mt-2 text-sm text-slate-600">This appointment has been removed.</p>
      </div>
    );
  }
  if (done || record.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Appointment cancelled</h1>
        <p className="mt-2 text-sm text-slate-600">{record.reference} is cancelled.</p>
      </div>
    );
  }
  if (kept) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Appointment kept</h1>
        <p className="mt-2 text-sm text-slate-600">{record.title} is still booked.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-white px-3 py-6 sm:items-center sm:px-6">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
          <h1 className="text-base font-semibold text-slate-800">Confirm Cancellation</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 6.5h12M5 2v3M11 2v3" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            #{record.reference}
          </span>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <label className="block text-sm font-medium text-slate-700">
            Remarks<span className="text-red-500">*</span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-md border border-primary/40 px-3 py-2 text-base text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setKept(true)}
              className="min-h-11 px-2 text-sm font-medium text-slate-700"
            >
              Don&apos;t Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Cancelling…" : "Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
