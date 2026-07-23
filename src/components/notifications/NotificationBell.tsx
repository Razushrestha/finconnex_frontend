"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Settings } from "lucide-react";
import {
  NOTIFICATION_SETTINGS_HREF,
  NOTIFICATION_TYPE_STYLE,
  countUnread,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  writeAllNotifications,
  type AppNotification,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  function reload() {
    setRows(listNotifications());
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!open) return;
    reload();
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = countUnread(rows);
  const preview = rows
    .filter((n) => n.status !== "Dismissed")
    .slice(0, 6);

  function onOpenItem(n: AppNotification) {
    if (n.status === "Unread") {
      const next = listNotifications().map((x) =>
        x.id === n.id ? markNotificationRead(x) : x,
      );
      writeAllNotifications(next);
      setRows(next);
    }
    setOpen(false);
    router.push("/notifications");
  }

  function onMarkAll() {
    const next = markAllNotificationsRead(listNotifications());
    writeAllNotifications(next);
    setRows(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-10 sm:w-10"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-[12px] font-semibold text-foreground">
                Notifications
              </p>
              <p className="text-[10px] text-muted-foreground">
                {unread} unread
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onMarkAll}
                disabled={unread === 0}
                title="Mark all read"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
              <Link
                href={NOTIFICATION_SETTINGS_HREF}
                onClick={() => setOpen(false)}
                title="Notification settings"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <ul className="max-h-[360px] overflow-y-auto">
            {preview.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(n)}
                  className={cn(
                    "flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-muted/70",
                    n.status === "Unread" && "bg-violet-50/60 dark:bg-violet-950/20",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      n.status === "Unread" ? "bg-violet-600" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-foreground">
                        {n.title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                          NOTIFICATION_TYPE_STYLE[n.type],
                        )}
                      >
                        {n.type}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      {n.sentAt}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {preview.length === 0 ? (
              <li className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                You&apos;re all caught up
              </li>
            ) : null}
          </ul>

          <div className="border-t border-border p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center justify-center rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
