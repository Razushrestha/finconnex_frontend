"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Clock,
  Mail,
  MailOpen,
  Paperclip,
  Star,
  Trash2,
} from "lucide-react";
import type { Email, EmailStatus } from "@/lib/emails/types";
import { deleteCrmEmail, tryCrmEmail } from "@/lib/emails/api";
import { deleteEmail, listEmails, updateEmail } from "@/lib/emails/store";
import { onRulesChange } from "@/lib/rules";
import { cardSubject } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STARRED_KEY = "finconnex.emails.starred";

function loadStarred(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STARRED_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function persistStarred(ids: Set<string>) {
  try {
    localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function displayName(email: Email): string {
  if (email.relatedTo) {
    return email.relatedTo.replace(/^(Lead|Contact|Deal|Company):\s*/i, "");
  }
  const source = email.from || email.to[0] || "Unknown";
  if (!source.includes("@")) return source;
  const local = source.split("@")[0] ?? source;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function snippetOf(email: Email): string {
  return email.body.replace(/\s+/g, " ").trim();
}

function isUnread(status: EmailStatus): boolean {
  return status !== "Opened";
}

function inboxDate(sentDate?: string): string {
  if (!sentDate) return "";
  const match = sentDate.trim().match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i,
  );
  if (!match) return sentDate;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const parsed = new Date(year, month, day);
  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();
  if (sameDay && match[4] && match[6]) {
    return `${Number(match[4])}:${match[5]} ${match[6].toUpperCase()}`;
  }
  if (parsed.getFullYear() === now.getFullYear()) {
    return parsed.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }
  return parsed.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface EmailListTableProps {
  data?: Email[];
}

export function EmailListTable({ data }: EmailListTableProps) {
  const router = useRouter();
  const [emails, setEmails] = useState(() => data ?? listEmails());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [starred, setStarred] = useState<Set<string>>(loadStarred);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setEmails(data);
      return;
    }
    return onRulesChange(() => setEmails(listEmails()));
  }, [data]);

  const allSelected =
    emails.length > 0 && selectedIds.length === emails.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : emails.map((e) => e.id));
  }

  function toggleStar(id: string) {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistStarred(next);
      return next;
    });
  }

  function openEmail(id: string) {
    const email = emails.find((e) => e.id === id);
    if (email && isUnread(email.status)) {
      updateEmail(id, { status: "Opened" });
      setEmails(listEmails());
    }
    router.push(`/activities/emails/detail/${id}`);
  }

  function markReadState(ids: string[], read: boolean) {
    for (const id of ids) {
      updateEmail(id, { status: read ? "Opened" : "Delivered" });
    }
    setEmails(listEmails());
  }

  function removeEmails(ids: string[]) {
    for (const id of ids) {
      void tryCrmEmail(() => deleteCrmEmail(id));
      deleteEmail(id);
    }
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    setEmails(listEmails());
  }

  const rows = useMemo(() => emails, [emails]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-slate-100 px-2">
        <label className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            aria-label="Select all emails"
            className="h-4 w-4 rounded border-slate-300 text-[#5A32A3] accent-[#5A32A3] focus:ring-[#5A32A3]/30"
          />
        </label>
        {selectedIds.length > 0 ? (
          <>
            <span className="mr-1 text-[12px] text-slate-500">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              title="Mark as read"
              onClick={() => markReadState(selectedIds, true)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-[#5A32A3]"
            >
              <MailOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Mark as unread"
              onClick={() => markReadState(selectedIds, false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-[#5A32A3]"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => removeEmails(selectedIds)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <span className="text-[12px] text-slate-400">Inbox</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#c4c7c5_transparent] [scrollbar-width:thin]">
        {rows.map((email) => {
          const unread = isUnread(email.status);
          const selected = selectedIds.includes(email.id);
          const starredRow = starred.has(email.id);
          const hovering = hoveredId === email.id;
          const who = displayName(email);

          return (
            <div
              key={email.id}
              data-focus-id={email.id}
              data-email-id={email.id}
              onMouseEnter={() => setHoveredId(email.id)}
              onMouseLeave={() => setHoveredId((id) => (id === email.id ? null : id))}
              onClick={() => openEmail(email.id)}
              className={cn(
                "group grid cursor-pointer grid-cols-[32px_32px_minmax(140px,180px)_minmax(0,1fr)_auto] items-center gap-1 border-b border-slate-100 px-2 py-[7px] transition-colors",
                selected
                  ? "bg-[#F3ECFB]"
                  : unread
                    ? "bg-white hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.15)]"
                    : "bg-[#f8f9fa] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.15)]",
              )}
            >
              <button
                type="button"
                aria-label={selected ? "Deselect" : "Select"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(email.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={selected}
                  className="pointer-events-none h-4 w-4 rounded border-slate-300 text-[#5A32A3] accent-[#5A32A3]"
                />
              </button>

              <button
                type="button"
                aria-label={starredRow ? "Unstar" : "Star"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(email.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    starredRow
                      ? "fill-[#f4b400] text-[#f4b400]"
                      : "text-slate-300 group-hover:text-slate-400",
                  )}
                />
              </button>

              <p
                className={cn(
                  "min-w-0 truncate pr-2 text-[13.5px] tracking-tight",
                  unread ? "font-bold text-slate-900" : "font-medium text-slate-700",
                )}
                title={who}
              >
                {who}
              </p>

              <div className="flex min-w-0 items-baseline gap-2">
                <p className="min-w-0 truncate text-[13.5px]">
                  {email.status === "Draft" ? (
                    <>
                      <span className="font-bold text-rose-600">Draft</span>
                      <span className={cn("text-slate-400", cardSubject)}>
                        {" "}
                        {email.subject || "(no subject)"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          unread ? "font-bold text-slate-900" : "font-medium text-slate-800",
                          cardSubject,
                        )}
                      >
                        {email.subject}
                      </span>
                      <span className="text-slate-400">
                        {" "}
                        – {snippetOf(email)}
                      </span>
                    </>
                  )}
                </p>
                {email.templateUsed ? (
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                ) : null}
              </div>

              <div className="flex h-8 min-w-[7.5rem] items-center justify-end pl-2">
                {hovering ? (
                  <div
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Archive"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-[#5A32A3]"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => removeEmails([email.id])}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={unread ? "Mark as read" : "Mark as unread"}
                      onClick={() => markReadState([email.id], unread)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-[#5A32A3]"
                    >
                      {unread ? (
                        <MailOpen className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Snooze"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-[#5A32A3]"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "whitespace-nowrap pr-2 text-[12px] tabular-nums",
                      unread ? "font-bold text-slate-800" : "text-slate-500",
                    )}
                  >
                    {inboxDate(email.sentDate)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-400">
            No emails in this inbox
          </p>
        ) : null}
      </div>
    </div>
  );
}
