"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarPlus,
  Clock,
  Flag,
  FolderInput,
  Forward,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Pin,
  Reply,
  ReplyAll,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import type { Email, EmailStatus } from "@/lib/emails/types";
import { deleteEmail, listEmails, updateEmail } from "@/lib/emails/store";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import {
  contactName,
  flagsFor,
  labelTone,
  moveToCustomFolder,
  onMailboxChange,
  restoreToInbox,
  setFocusOverride,
  setMailboxFlag,
  clearLabels,
  toggleLabel,
  toggleMailboxFlag,
  type MailFolder,
  type MailLabel,
  MAIL_LABELS,
} from "@/lib/emails/mailbox";
import { listUserFolders, type MailUserFolder } from "@/lib/emails/folders";
import {
  draftFromEmail,
  meetingHref,
  sortMailboxRows,
  stashCompose,
  type ComposeMode,
} from "@/lib/emails/outlook";

function snippetOf(email: Email): string {
  return email.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
    return `${Number(match[4])}:${match[5]}${match[6].toUpperCase()}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    parsed.getFullYear() === yesterday.getFullYear() &&
    parsed.getMonth() === yesterday.getMonth() &&
    parsed.getDate() === yesterday.getDate();
  if (isYesterday && match[4] && match[6]) {
    return `Yesterday, ${Number(match[4])}:${match[5]}${match[6].toUpperCase()}`;
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

function tomorrowMorning() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours() % 12 || 12;
  const ap = d.getHours() >= 12 ? "PM" : "AM";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(h)}:00 ${ap}`;
}

const iconBtn =
  "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

interface EmailListTableProps {
  data?: Email[];
  folderLabel?: string;
  folder?: MailFolder;
  customFolderId?: string | null;
  onCompose?: () => void;
}

export function EmailListTable({
  data,
  folderLabel = "Inbox",
  folder = "inbox",
  customFolderId = null,
  onCompose,
}: EmailListTableProps) {
  const router = useRouter();
  const [emails, setEmails] = useState(() => data ?? listEmails());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [labelMenuFor, setLabelMenuFor] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const userFolders = useMemo(() => {
    void tick;
    return listUserFolders();
  }, [tick]);
  const canRestore = folder === "trash" || folder === "spam" || folder === "archive";

  useEffect(() => {
    if (data) {
      setEmails(data);
      return;
    }
    return onRulesChange(() => setEmails(listEmails()));
  }, [data]);

  useEffect(() => onMailboxChange(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => emails.some((email) => email.id === id)));
  }, [emails]);

  const allSelected =
    emails.length > 0 && selectedIds.length === emails.length;
  const selectedEmail =
    selectedIds.length === 1
      ? emails.find((email) => email.id === selectedIds[0])
      : undefined;

  function refresh() {
    if (!data) setEmails(listEmails());
    setTick((n) => n + 1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : emails.map((e) => e.id));
  }

  function openEmail(id: string) {
    const email = emails.find((e) => e.id === id);
    if (email && isUnread(email.status)) {
      updateEmail(id, { status: "Opened" });
      if (!data) setEmails(listEmails());
    }
    router.push(`/activities/emails/detail/${id}`);
  }

  function markReadState(ids: string[], read: boolean) {
    for (const id of ids) {
      updateEmail(id, { status: read ? "Opened" : "Delivered" });
    }
    refresh();
  }

  function removeEmails(ids: string[]) {
    if (folder === "trash") {
      for (const id of ids) deleteEmail(id);
    } else {
      for (const id of ids) setMailboxFlag(id, "trash", true);
    }
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    refresh();
  }

  function restoreEmails(ids: string[]) {
    for (const id of ids) restoreToInbox(id);
    setSelectedIds([]);
    refresh();
  }

  function move(ids: string[], key: "archived" | "spam" | "important" | "starred" | "pinned") {
    for (const id of ids) {
      if (key === "starred" || key === "important" || key === "pinned") {
        toggleMailboxFlag(id, key);
      } else {
        setMailboxFlag(id, key, true);
      }
    }
    if (key === "archived" || key === "spam") setSelectedIds([]);
    refresh();
  }

  function snooze(ids: string[]) {
    for (const id of ids) {
      updateEmail(id, { status: "Scheduled", sentDate: tomorrowMorning() });
    }
    setSelectedIds([]);
    refresh();
  }

  function composeFrom(mode: ComposeMode, email = selectedEmail) {
    if (!email) return;
    stashCompose(draftFromEmail(email, mode));
    router.push("/activities/emails/create");
  }

  function startMeeting(email = selectedEmail) {
    if (!email) return;
    router.push(meetingHref(email));
  }

  function moveSelectedTo(folder: MailUserFolder | null) {
    for (const id of selectedIds) moveToCustomFolder(id, folder?.id ?? null);
    setSelectedIds([]);
    setMoveOpen(false);
    refresh();
  }

  const rows = useMemo(() => sortMailboxRows(emails), [emails, tick]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b border-slate-100 px-2 py-1.5">
        <label className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            aria-label="Select all emails"
            className="h-4 w-4 rounded border-slate-300 text-[#5A32A3] accent-[#5A32A3]"
          />
        </label>
        <span className="mr-auto text-[13px] font-semibold text-slate-700">
          {selectedIds.length > 0 ? `${selectedIds.length} selected` : folderLabel}
        </span>
        {selectedIds.length > 0 ? (
          <>
            <button
              type="button"
              disabled={!selectedEmail}
              onClick={() => composeFrom("reply")}
              className={iconBtn}
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
            <button
              type="button"
              disabled={!selectedEmail}
              onClick={() => composeFrom("replyAll")}
              className={iconBtn}
            >
              <ReplyAll className="h-3.5 w-3.5" />
              Reply all
            </button>
            <button
              type="button"
              disabled={!selectedEmail}
              onClick={() => composeFrom("forward")}
              className={iconBtn}
            >
              <Forward className="h-3.5 w-3.5" />
              Forward
            </button>
            <button
              type="button"
              disabled={!selectedEmail}
              onClick={() => composeFrom("forwardAttach")}
              className={iconBtn}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Forward as attachment
            </button>
            <button
              type="button"
              disabled={!selectedEmail}
              onClick={() => startMeeting()}
              className={iconBtn}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Meeting
            </button>
            <button
              type="button"
              onClick={() => move(selectedIds, "important")}
              className={iconBtn}
            >
              <Flag className="h-3.5 w-3.5" />
              Flag
            </button>
            <button
              type="button"
              onClick={() => move(selectedIds, "pinned")}
              className={iconBtn}
            >
              <Pin className="h-3.5 w-3.5" />
              Pin
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoveOpen((v) => !v)}
                className={iconBtn}
              >
                <FolderInput className="h-3.5 w-3.5" />
                Move
              </button>
              {moveOpen ? (
                <div className="absolute top-9 right-0 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => moveSelectedTo(null)}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Inbox
                  </button>
                  {userFolders.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => moveSelectedTo(item)}
                      className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      {item.name}
                    </button>
                  ))}
                  {userFolders.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-slate-400">
                      Create a folder in the left sidebar
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {canRestore ? (
              <button
                type="button"
                onClick={() => restoreEmails(selectedIds)}
                className={iconBtn}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => move(selectedIds, "archived")}
                  className={iconBtn}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => move(selectedIds, "spam")}
                  className={iconBtn}
                >
                  Spam
                </button>
              </>
            )}
            <button
              type="button"
              title="Delete"
              onClick={() => removeEmails(selectedIds)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute top-9 right-0 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      markReadState(selectedIds, true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Mark as read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markReadState(selectedIds, false);
                      setMenuOpen(false);
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Mark as unread
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      snooze(selectedIds);
                      setMenuOpen(false);
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Snooze until tomorrow
                  </button>
                  {selectedEmail ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusOverride(selectedEmail.id, "focused");
                          setMenuOpen(false);
                          refresh();
                        }}
                        className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                      >
                        Move to Focused
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusOverride(selectedEmail.id, "other");
                          setMenuOpen(false);
                          refresh();
                        }}
                        className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                      >
                        Move to Other
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute top-9 right-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    markReadState(emails.map((e) => e.id), true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  Mark all as read
                </button>
                {onCompose ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onCompose();
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    Compose mail
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#c4c7c5_transparent] [scrollbar-width:thin]">
        {rows.map((email) => {
          const unread = isUnread(email.status);
          const selected = selectedIds.includes(email.id);
          const flags = flagsFor(email.id, email);
          const hovering = hoveredId === email.id;
          const who = contactName(email);
          const labels = flags.labels ?? [];

          return (
            <div
              key={email.id}
              data-focus-id={email.id}
              data-email-id={email.id}
              onMouseEnter={() => setHoveredId(email.id)}
              onMouseLeave={() => {
                setHoveredId((id) => (id === email.id ? null : id));
                setLabelMenuFor((id) => (id === email.id ? null : id));
              }}
              onClick={() => openEmail(email.id)}
              className={cn(
                "group flex cursor-pointer items-start gap-1.5 border-b border-slate-100 px-2 py-2.5 transition-colors",
                selected
                  ? "bg-[#F3ECFB]"
                  : unread
                    ? "bg-white hover:bg-slate-50"
                    : "bg-[#f8f9fa] hover:bg-slate-50",
              )}
            >
              <button
                type="button"
                aria-label={selected ? "Deselect" : "Select"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(email.id);
                }}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
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
                title={flags.important ? "Unflag" : "Flag"}
                onClick={(e) => {
                  e.stopPropagation();
                  move([email.id], "important");
                }}
                className="mt-1 flex h-8 w-6 shrink-0 items-center justify-center"
              >
                <Flag
                  className={cn(
                    "h-4 w-4",
                    flags.important
                      ? "fill-[#e11d48] text-[#e11d48]"
                      : "text-slate-300",
                  )}
                />
              </button>

              {flags.pinned ? (
                <span className="mt-2 flex h-6 w-4 shrink-0 items-center justify-center" title="Pinned">
                  <Pin className="h-3.5 w-3.5 fill-[#5A32A3] text-[#5A32A3]" />
                </span>
              ) : (
                <span className="w-0 shrink-0" />
              )}

              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  avatarColor(who),
                )}
              >
                {initials(who)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-[13.5px] tracking-tight",
                      unread ? "font-bold text-slate-900" : "font-medium text-slate-700",
                    )}
                    title={who}
                  >
                    {who}
                  </p>
                  {labels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      title={`Remove ${label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLabel(email.id, label, email);
                        refresh();
                      }}
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold hover:opacity-70",
                        labelTone(label),
                      )}
                    >
                      {label} ×
                    </button>
                  ))}
                  <span
                    className={cn(
                      "ml-auto shrink-0 text-[11px] tabular-nums",
                      unread ? "font-bold text-slate-700" : "text-slate-400",
                    )}
                  >
                    {inboxDate(email.sentDate)}
                  </span>
                </div>

                <div className="mt-0.5 flex items-start gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px]">
                    {email.status === "Draft" ? (
                      <>
                        <span className="font-bold text-rose-600">Draft</span>
                        <span className="text-slate-500">
                          {" "}
                          {email.subject || "(no subject)"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span
                          className={
                            unread
                              ? "font-bold text-slate-900"
                              : "font-semibold text-slate-800"
                          }
                        >
                          {email.subject}
                        </span>
                        <span className="text-slate-400"> – {snippetOf(email)}</span>
                      </>
                    )}
                  </p>
                  {email.templateUsed ? (
                    <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  ) : null}
                  <div
                    className="flex shrink-0 items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {hovering ? (
                      <div className="relative flex items-center">
                        <button
                          type="button"
                          title={flags.pinned ? "Unpin" : "Pin"}
                          onClick={() => move([email.id], "pinned")}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-[#5A32A3]"
                        >
                          <Pin
                            className={cn(
                              "h-3.5 w-3.5",
                              flags.pinned && "fill-[#5A32A3] text-[#5A32A3]",
                            )}
                          />
                        </button>
                        {canRestore ? (
                          <button
                            type="button"
                            title="Restore"
                            onClick={() => restoreEmails([email.id])}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-[#5A32A3]"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Archive"
                            onClick={() => move([email.id], "archived")}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-[#5A32A3]"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => removeEmails([email.id])}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={unread ? "Mark as read" : "Mark as unread"}
                          onClick={() => markReadState([email.id], unread)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-[#5A32A3]"
                        >
                          {unread ? (
                            <MailOpen className="h-3.5 w-3.5" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Labels"
                          onClick={() =>
                            setLabelMenuFor((id) => (id === email.id ? null : email.id))
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-[#5A32A3]"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {labelMenuFor === email.id ? (
                          <div className="absolute top-8 right-0 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <p className="px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                              Labels
                            </p>
                            {MAIL_LABELS.map((item) => {
                              const on = labels.includes(item.id);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    toggleLabel(email.id, item.id as MailLabel, email);
                                    refresh();
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                                >
                                  <span
                                    className={cn(
                                      "flex h-3.5 w-3.5 items-center justify-center rounded border",
                                      on
                                        ? "border-[#5A32A3] bg-[#5A32A3] text-white"
                                        : "border-slate-300",
                                    )}
                                  >
                                    {on ? "✓" : ""}
                                  </span>
                                  <span className={cn("h-2 w-2 rounded-full", item.dot)} />
                                  {item.id}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                clearLabels(email.id);
                                refresh();
                              }}
                              className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-500 hover:bg-slate-50"
                            >
                              No label
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      title={flags.starred ? "Unstar" : "Star"}
                      onClick={() => move([email.id], "starred")}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          flags.starred
                            ? "fill-[#f4b400] text-[#f4b400]"
                            : "text-slate-300",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-400">
            No emails in {folderLabel.toLowerCase()}
            {customFolderId ? " folder" : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
