"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  ArrowLeft,
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
    <div className="flex min-h-0 min-h-full w-full flex-1 flex-col overflow-hidden bg-background p-2 pr-3">
      <div className="w-full shrink-0 border-b border-slate-200/80 bg-background">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-1 py-2 sm:gap-x-3">
          <Link
            href="/marketing/inbox"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <nav className="hidden items-center gap-1 text-[11px] text-slate-400 md:flex">
            <Link
              href="/"
              className="flex items-center gap-0.5 hover:text-slate-600"
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>
            <span>/</span>
            <Link href="/marketing/inbox" className="text-slate-500 hover:text-slate-600">
              Unified Inbox
            </Link>
            <span>/</span>
            <span className="text-slate-500">Channels</span>
          </nav>
          <div className="hidden h-4 w-px bg-slate-200 md:block" />
          <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
            Channel connections
          </h1>
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[12px] text-slate-500">
              Connect Facebook Page, Instagram Business, WhatsApp Business,
              SMS, Email, and Web Chat. OAuth is mocked for v1.
            </p>
          </div>
          <ul className="divide-y divide-slate-50">
            {connections.map((conn) => (
              <li
                key={conn.channel}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {conn.channel}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {conn.connected
                      ? conn.accountLabel || "Connected"
                      : "Not connected"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(conn)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold",
                    conn.connected
                      ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      : "bg-violet-600 text-white hover:bg-violet-700",
                  )}
                >
                  {conn.connected ? (
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
