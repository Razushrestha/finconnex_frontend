"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Plug, Unplug } from "lucide-react";
import {
  authorizeCalendarSync,
  disconnectCalendarSync,
  listCalendarSyncConnections,
  syncCalendarConnection,
  type CalendarSyncConnection,
} from "@/lib/booking/calendly-integration-api";
import { cn } from "@/lib/utils";

export function CalendarSyncSettingsClient({
  provider,
}: {
  provider: "google" | "outlook";
}) {
  const label = provider === "google" ? "Google Calendar" : "Outlook Calendar";
  const [rows, setRows] = useState<CalendarSyncConnection[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const all = await listCalendarSyncConnections();
      setRows(all.filter((row) => row.provider === provider));
      setError("");
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error ? err.message : `Could not load ${label} connections.`,
      );
    }
  }, [label, provider]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError("");
    setNote("");
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calendar request failed.");
    } finally {
      setBusy("");
    }
  }

  const mine = rows.filter((row) => row.provider === provider);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-bold text-slate-900">{label}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            GET /v1/calendar-sync/{provider}/authorize — workspace OWNER or ADMIN.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            mine.some((row) => row.connected)
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {mine.some((row) => row.connected) ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            void run("connect", async () => {
              window.location.assign(await authorizeCalendarSync(provider));
            })
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {busy === "connect" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug className="h-3.5 w-3.5" />
          )}
          Connect {label}
        </button>
      </div>

      {mine.length ? (
        <ul className="mt-4 space-y-2">
          {mine.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-[12px] text-slate-600"
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {row.email || row.provider || provider}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="font-semibold text-violet-700"
                  onClick={() =>
                    void run(`sync-${row.id}`, async () => {
                      await syncCalendarConnection(row.id);
                      setNote("Calendar synced.");
                    })
                  }
                >
                  Sync
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-rose-600"
                  onClick={() =>
                    void run(`off-${row.id}`, async () => {
                      await disconnectCalendarSync(row.id);
                    })
                  }
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[12px] text-slate-400">
          No {label} connection yet.
        </p>
      )}

      {note ? <p className="mt-2 text-[12px] text-emerald-700">{note}</p> : null}
      {error ? <p className="mt-2 text-[12px] text-rose-600">{error}</p> : null}
    </div>
  );
}
