"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Bell,
  CheckCheck,
  Download,
  Settings,
  ExternalLink,
  X,
  Search,
  Eye,
} from "lucide-react";
import {
  NOTIFICATION_SETTINGS_HREF,
  NOTIFICATION_STATUSES,
  NOTIFICATION_STATUS_STYLE,
  NOTIFICATION_TYPE_STYLE,
  NOTIFICATION_TYPES,
  countUnread,
  exportNotificationsCsv,
  listNotifications,
  markAllNotificationsRead,
  markNotificationDismissed,
  markNotificationRead,
  seedNotifications,
  writeAllNotifications,
  type AppNotification,
  type NotificationStatus,
  type NotificationType,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export function NotificationsCenterClient() {
  const router = useRouter();
  const [rows, setRows] = useState<AppNotification[]>(seedNotifications);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "All">(
    "All",
  );
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "All">(
    "Unread",
  );
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function reload() {
    setRows(listNotifications());
  }

  useEffect(() => {
    reload();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  function persist(next: AppNotification[]) {
    writeAllNotifications(next);
    setRows(next);
  }

  const filtered = useMemo(() => {
    let data = rows;
    if (typeFilter !== "All") data = data.filter((n) => n.type === typeFilter);
    if (statusFilter !== "All")
      data = data.filter((n) => n.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.notificationId.toLowerCase().includes(q) ||
          n.relatedTo.toLowerCase().includes(q) ||
          n.recipient.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, typeFilter, statusFilter, search]);

  const selected =
    filtered.find((n) => n.id === selectedId) ??
    rows.find((n) => n.id === selectedId) ??
    null;

  const unread = countUnread(rows);

  function onView(n: AppNotification) {
    setSelectedId(n.id);
    if (n.status === "Unread") {
      const next = rows.map((x) =>
        x.id === n.id ? markNotificationRead(x) : x,
      );
      persist(next);
    }
  }

  function onMarkRead(n: AppNotification) {
    persist(rows.map((x) => (x.id === n.id ? markNotificationRead(x) : x)));
    flash("Marked as read");
  }

  function onMarkAllRead() {
    persist(markAllNotificationsRead(rows));
    flash("All marked as read");
  }

  function onDismiss(n: AppNotification) {
    persist(
      rows.map((x) => (x.id === n.id ? markNotificationDismissed(x) : x)),
    );
    if (selectedId === n.id) setSelectedId(null);
    flash("Dismissed");
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Bell className="h-2.5 w-2.5" />
              §18
            </span>
            {unread > 0 ? (
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold text-white">
                {unread} unread
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unread === 0}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => {
                exportNotificationsCsv(filtered);
                flash("Log exported");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export log
            </button>
            <Link
              href={NOTIFICATION_SETTINGS_HREF}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white hover:bg-violet-700"
            >
              <Settings className="h-3.5 w-3.5" />
              Notification settings
            </Link>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusFilter === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {NOTIFICATION_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusFilter === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {rows.filter((n) => n.status === s).length}
            </button>
          ))}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as NotificationType | "All")
            }
            className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-400"
          >
            <option value="All">All types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, message, related…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
            <ul className="divide-y divide-slate-50">
              {filtered.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onView(n)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-50/50",
                      selectedId === n.id && "bg-violet-50/70",
                      n.status === "Unread" && "bg-violet-50/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.status === "Unread"
                          ? "bg-violet-600"
                          : "bg-transparent",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-slate-900">
                          {n.title}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            NOTIFICATION_TYPE_STYLE[n.type],
                          )}
                        >
                          {n.type}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            NOTIFICATION_STATUS_STYLE[n.status],
                          )}
                        >
                          {n.status}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">
                        {n.message}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
                        <span>{n.notificationId}</span>
                        <span>{n.relatedTo}</span>
                        <span>{n.sentAt}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-4 py-10 text-center text-[12px] text-slate-400">
                  No notifications match
                </li>
              ) : null}
            </ul>
          </div>

          <aside className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      {selected.notificationId}
                    </div>
                    <h2 className="mt-0.5 text-[14px] font-bold text-slate-900">
                      {selected.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      NOTIFICATION_TYPE_STYLE[selected.type],
                    )}
                  >
                    {selected.type}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      NOTIFICATION_STATUS_STYLE[selected.status],
                    )}
                  >
                    {selected.status}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-700">
                  {selected.message}
                </p>
                <dl className="space-y-2 text-[11px]">
                  <div>
                    <dt className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                      Related to
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {selected.relatedTo}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                      Recipient
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {selected.recipient}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                      Sent
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {selected.sentAt}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                      Read
                    </dt>
                    <dd className="mt-0.5 font-medium text-slate-800">
                      {selected.readAt ?? "—"}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => router.push(selected.relatedHref)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-[11px] font-semibold text-white hover:bg-violet-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View related record
                  </button>
                  {selected.status === "Unread" ? (
                    <button
                      type="button"
                      onClick={() => onMarkRead(selected)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Mark as read
                    </button>
                  ) : null}
                  {selected.status !== "Dismissed" ? (
                    <button
                      type="button"
                      onClick={() => onDismiss(selected)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                <Bell className="mb-2 h-6 w-6 text-slate-300" />
                <p className="text-[12px] font-medium text-slate-500">
                  Select a notification to view
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Viewing marks unread items as read
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
