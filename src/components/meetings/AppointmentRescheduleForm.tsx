"use client";

import { useEffect, useMemo, useState } from "react";
import { timezoneChoiceList } from "@/lib/booking/timezones";
import {
  appointmentSlotTimes,
  formatAppointmentStamp,
  formatDurationLabel,
  formatSlotClock,
  slotPeriod,
  type AppointmentManageRecord,
} from "@/lib/meetings/appointment-manage";

const PERIODS = ["Morning", "Afternoon", "Evening"] as const;

export function AppointmentRescheduleForm({ token }: { token: string }) {
  const [record, setRecord] = useState<AppointmentManageRecord | null | undefined>(undefined);
  const [dateIso, setDateIso] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kathmandu");
  const [slot, setSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const zones = useMemo(() => timezoneChoiceList(), []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/appointment/manage/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("missing");
        return (await res.json()) as AppointmentManageRecord;
      })
      .then((next) => {
        if (cancelled) return;
        setRecord(next);
        setDateIso(next.dateIso);
        setTimeZone(next.timeZone || "Asia/Kathmandu");
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, string[]>(PERIODS.map((label) => [label, []]));
    for (const time of appointmentSlotTimes()) {
      buckets.get(slotPeriod(time))?.push(time);
    }
    return PERIODS.map((label) => ({ label, slots: buckets.get(label) ?? [] })).filter(
      (period) => period.slots.length,
    );
  }, []);

  async function submit() {
    if (!dateIso || !slot) {
      setError("Choose a date and a time slot.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/appointment/manage/${encodeURIComponent(token)}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateIso, startHHmm: slot, timeZone }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not reschedule this appointment.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reschedule this appointment.");
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
    return <p className="p-8 text-center text-sm text-slate-600">This appointment has been removed.</p>;
  }
  if (record.status === "cancelled") {
    return <p className="p-8 text-center text-sm text-slate-600">This appointment is already cancelled.</p>;
  }
  if (done) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Appointment rescheduled</h1>
        <p className="mt-2 text-sm text-slate-600">
          {record.title} is now {formatAppointmentStamp(dateIso, slot)}.
        </p>
      </div>
    );
  }

  const initial = record.title.trim().charAt(0).toLowerCase() || "a";

  return (
    <div className="min-h-dvh bg-white px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-lg sm:min-h-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <h1 className="text-base font-semibold text-slate-800 sm:text-lg">Reschedule Appointment</h1>
          <button
            type="button"
            aria-label="Close"
            onClick={() => window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-violet-300 text-lg text-violet-700">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{record.title}</p>
                <p className="text-sm text-slate-500">{formatDurationLabel(record.durationMinutes)}</p>
              </div>
            </div>
            <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-10">
              <p>Booking Id: <span className="font-medium text-slate-800">{record.reference}</span></p>
              <p>User: <span className="font-medium text-slate-800">{record.guestName}</span></p>
              <p className="sm:col-span-2">
                Date &amp; Time:{" "}
                <span className="font-medium text-slate-800">
                  {formatAppointmentStamp(record.dateIso, record.startHHmm)}
                </span>
              </p>
            </div>
          </div>

          <h2 className="mt-6 text-base font-semibold text-slate-800">Reschedule To</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Date
              <input
                type="date"
                value={dateIso}
                onChange={(event) => setDateIso(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-800 sm:text-sm"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Time zone
              <select
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-800 sm:text-sm"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2 className="mt-8 text-base font-semibold text-slate-800">Slot Availability</h2>
          {grouped.map((period) => (
            <div key={period.label} className="mt-5">
              <div className="mb-3 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                {period.label}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="flex flex-wrap gap-2">
                {period.slots.map((time) => {
                  const selected = slot === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSlot(time)}
                      className={
                        selected
                          ? "min-h-10 rounded-md bg-[#3c3489] px-3 py-2 text-sm text-white"
                          : "min-h-10 rounded-md border border-[#5b4db7] px-3 py-2 text-sm text-[#3c3489]"
                      }
                    >
                      {formatSlotClock(time)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="sticky bottom-0 grid grid-cols-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="h-12 bg-slate-200 text-sm font-medium text-slate-800 sm:h-14"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !slot}
            onClick={() => void submit()}
            className="h-12 bg-[#3c3489] text-sm font-semibold text-white disabled:opacity-50 sm:h-14"
          >
            {saving ? "Saving…" : "Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
