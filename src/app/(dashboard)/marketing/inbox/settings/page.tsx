"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  ArrowLeft,
  Settings,
  Plug,
  Unplug,
} from "lucide-react";
import {
  listChannelConnections,
  upsertChannelConnection,
  type InboxChannelConnection,
} from "@/lib/marketing/inbox/types";
import { cn } from "@/lib/utils";

export default function InboxSettingsPage() {
  const [connections, setConnections] = useState<InboxChannelConnection[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setConnections(listChannelConnections());
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function toggle(conn: InboxChannelConnection) {
    const next = { ...conn, connected: !conn.connected };
    upsertChannelConnection(next);
    setConnections((prev) =>
      prev.map((c) => (c.channel === next.channel ? next : c)),
    );
    flash(
      next.connected
        ? `Connected ${next.channel} (mock OAuth)`
        : `Disconnected ${next.channel}`,
    );
  }

  return (
    <div className="relative min-h-full bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto max-w-[900px] p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Link
            href="/marketing/inbox"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/inbox" className="hover:text-slate-600">
              Inbox
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            Channel connections
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
            <Settings className="h-2.5 w-2.5" />
            Settings
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[12px] text-slate-500">
              Connect Facebook Page, Instagram Business, WhatsApp Business,
              SMS, Email, and Web Chat. OAuth is mocked for v1.
            </p>
          </div>
          <ul className="divide-y divide-slate-50">
            {connections.map((c) => (
              <li
                key={c.channel}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">
                    {c.channel}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {c.accountLabel} · via {c.via}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      c.connected
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {c.connected ? "Connected" : "Disconnected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold",
                      c.connected
                        ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        : "bg-violet-600 text-white hover:bg-violet-700",
                    )}
                  >
                    {c.connected ? (
                      <>
                        <Unplug className="h-3.5 w-3.5" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Plug className="h-3.5 w-3.5" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
