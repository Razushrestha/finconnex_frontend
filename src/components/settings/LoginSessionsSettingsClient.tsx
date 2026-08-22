"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, ShieldOff, Trash2 } from "lucide-react";

type AuthSessionRow = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  ipHash: string;
  userAgent?: string;
  current: boolean;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Settings → Users & Access → Login Sessions */
export function LoginSessionsSettingsClient() {
  const [sessions, setSessions] = useState<AuthSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/auth/sessions", { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as {
      sessions?: AuthSessionRow[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not load sessions");
    }
    setSessions(data.sessions ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load sessions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function revoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not revoke session");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke session");
    } finally {
      setBusyId(null);
    }
  }

  async function logoutAll() {
    setBusyId("all");
    setError(null);
    try {
      const res = await fetch("/api/auth/logout-all", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not sign out all devices");
      window.location.assign("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sign out all devices",
      );
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900">Login sessions</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Devices signed in with your CRM account. Revoke a session or sign out
            everywhere.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logoutAll()}
          disabled={busyId === "all" || loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          Sign out all devices
        </button>
      </div>

      {error ? (
        <p className="border-b border-rose-100 bg-rose-50 px-5 py-2.5 text-[12px] text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="px-5 py-10 text-center text-[12px] text-slate-400">
          Loading sessions…
        </p>
      ) : sessions.length === 0 ? (
        <p className="px-5 py-10 text-center text-[12px] text-slate-400">
          No active sessions.
        </p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {sessions.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <Monitor className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-800">
                    {row.current ? "This device" : row.userAgent || "Unknown device"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Last used {formatWhen(row.lastUsedAt)} · Started{" "}
                    {formatWhen(row.createdAt)}
                  </p>
                </div>
              </div>
              {row.current ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Current
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void revoke(row.id)}
                  disabled={busyId === row.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
