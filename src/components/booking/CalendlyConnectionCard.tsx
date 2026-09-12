"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import {
  authorizeCalendarSync,
  checkCalendlyHealth,
  connectCalendly,
  startCalendlyOAuth,
  disconnectCalendarSync,
  disconnectCalendly,
  getCalendlyConnection,
  listCalendarSyncConnections,
  registerCalendlyWebhook,
  syncCalendarConnection,
  syncCalendlyCatalog,
  type CalendarSyncConnection,
  type CalendlyConnection,
} from "@/lib/booking/calendly-integration-api";
import { listCalendlyHosts } from "@/lib/booking/calendly-api";
import { cn } from "@/lib/utils";

export function CalendlyConnectionCard({
  compact = false,
  showCalendarSync = true,
  onChanged,
}: {
  compact?: boolean;
  showCalendarSync?: boolean;
  onChanged?: () => void;
}) {
  const [connection, setConnection] = useState<CalendlyConnection | null>(null);
  const [calendars, setCalendars] = useState<CalendarSyncConnection[]>([]);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const hosts = await listCalendlyHosts({ active: true }).catch(() => []);
      if (hosts.length > 0) {
        setConnection({
          connected: true,
          status: "connected",
          raw: {},
        });
        setError("");
      } else {
        const next = await getCalendlyConnection();
        setConnection(next);
        setError("");
      }
    } catch (err) {
      setConnection({
        connected: false,
        status: "disconnected",
        raw: {},
      });
      setError(err instanceof Error ? err.message : "Could not load Calendly status.");
    }
    if (showCalendarSync) {
      try {
        setCalendars(await listCalendarSyncConnections());
      } catch {
        setCalendars([]);
      }
    }
  }, [showCalendarSync]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNote("");
    try {
      await fn();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calendly request failed.");
    } finally {
      setBusy("");
    }
  }

  async function startOAuth() {
    await run("oauth", async () => {
      const authorizationUrl = await startCalendlyOAuth();
      window.location.assign(authorizationUrl);
    });
  }

  async function connectWithToken() {
    const personalAccessToken = token.trim();
    if (!personalAccessToken) {
      setError("Paste a Calendly personal access token, or use Connect with Calendly.");
      return;
    }
    await run("pat", async () => {
      const result = await connectCalendly({ personalAccessToken });
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      setToken("");
      setNote("Calendly connected with a personal access token.");
      await syncCalendlyCatalog().catch(() => undefined);
      await registerCalendlyWebhook().catch(() => undefined);
    });
  }

  const connected = Boolean(connection?.connected);

  return (
    <section
      className={cn(
        "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Calendly</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {connected
              ? `Connected${connection?.user ? ` as ${connection.user}` : ""}${
                  connection?.organization ? ` · ${connection.organization}` : ""
                }`
              : "Calendly OAuth is not enabled on the CRM server. Paste a personal access token from Calendly → Integrations → API & webhooks."}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            connected
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("sync", async () => {
                  await syncCalendlyCatalog();
                  await registerCalendlyWebhook().catch(() => undefined);
                  setNote("Calendly hosts and event types synced.");
                })
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "sync" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync catalog
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("health", async () => {
                  await checkCalendlyHealth();
                  setNote("Calendly connection is healthy.");
                })
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Check health
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("disconnect", async () => {
                  await disconnectCalendly();
                  setNote("Calendly disconnected.");
                })
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-[12px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void startOAuth()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy === "oauth" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Try OAuth
          </button>
        )}
      </div>

      {!connected ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Calendly personal access token"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void connectWithToken()}
            className="h-9 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy === "pat" ? "Connecting…" : "Connect token"}
          </button>
        </div>
      ) : null}

      {showCalendarSync ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
            <CalendarDays className="h-3.5 w-3.5" />
            Google / Outlook calendars
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("google", async () => {
                  window.location.assign(await authorizeCalendarSync("google"));
                })
              }
              className="h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Connect Google
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("outlook", async () => {
                  window.location.assign(await authorizeCalendarSync("outlook"));
                })
              }
              className="h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Connect Outlook
            </button>
          </div>
          {calendars.length ? (
            <ul className="mt-2 space-y-1">
              {calendars.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 text-[12px] text-slate-600"
                >
                  <span>
                    {row.provider || "calendar"}
                    {row.email ? ` · ${row.email}` : ""}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="font-semibold text-[#5A32A3]"
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
                      className="font-semibold text-rose-600"
                      onClick={() =>
                        void run(`off-${row.id}`, async () => {
                          await disconnectCalendarSync(row.id);
                        })
                      }
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-slate-400">
              No Google or Outlook calendars connected yet.
            </p>
          )}
        </div>
      ) : null}

      {note ? <p className="mt-2 text-[12px] text-emerald-700">{note}</p> : null}
      {error ? <p className="mt-2 text-[12px] text-rose-600">{error}</p> : null}
    </section>
  );
}
