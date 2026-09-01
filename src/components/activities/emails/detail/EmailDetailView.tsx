"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flag,
  FolderInput,
  Forward,
  ListTree,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Pin,
  Reply,
  ReplyAll,
  Smile,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Email } from "@/lib/emails/types";
import { deleteEmail, listEmails, updateEmail } from "@/lib/emails/store";
import {
  contactName,
  flagsFor,
  labelTone,
  moveToCustomFolder,
  setMailboxFlag,
  toggleMailboxFlag,
} from "@/lib/emails/mailbox";
import { listUserFolders } from "@/lib/emails/folders";
import {
  draftFromEmail,
  meetingHref,
  stashCompose,
  summariseEmail,
} from "@/lib/emails/outlook";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { CrmProfileCard } from "@/components/activities/emails/detail/CrmProfileCard";
import { ActivityTimeline } from "@/components/activities/emails/detail/ActivityTimeline";
import { ActivityTimelineButton } from "@/components/activities/ActivityTimelineButton";

function attachmentsFor(email: Email) {
  const hay = `${email.subject} ${email.body} ${email.templateUsed ?? ""}`.toLowerCase();
  const files: { name: string; size: string; kind: "pdf" | "img" }[] = [];
  if (hay.includes("payslip")) files.push({ name: "Payslips.pdf", size: "245 KB", kind: "pdf" });
  if (hay.includes("document") || hay.includes("id")) {
    files.push({ name: "ID_Document.jpg", size: "856 KB", kind: "img" });
  }
  if (hay.includes("proposal") || hay.includes("bank") || email.templateUsed) {
    files.push({
      name: `${(email.templateUsed || "Attachment").replace(/\s+/g, "_")}.pdf`,
      size: "1.2 MB",
      kind: "pdf",
    });
  }
  return files.slice(0, 3);
}

const EMAIL_REACTION_EMOJIS = [
  "👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉",
  "🙏", "👏", "🔥", "💯", "👀", "✅", "❗", "😊",
  "😍", "🤝", "💡", "📌", "⭐", "🤔", "😅", "🙌",
];

const toolBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-slate-600 hover:bg-slate-100";

interface EmailDetailViewProps {
  email: Email;
  backHref: string;
  backLabel: string;
}

export function EmailDetailView({ email, backHref, backLabel }: EmailDetailViewProps) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSummary(null);
    setReaction(null);
    setEmojiOpen(false);
  }, [email.id]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onDoc(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [emojiOpen]);

  const flags = useMemo(() => {
    void tick;
    return flagsFor(email.id, email);
  }, [email, tick]);
  const folders = useMemo(() => {
    void tick;
    return listUserFolders();
  }, [tick]);

  const who = contactName(email);
  const labels = flags.labels ?? [];
  const files = attachmentsFor(email);
  const ids = listEmails().map((item) => item.id);
  const index = ids.indexOf(email.id);
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  function refresh() {
    setTick((n) => n + 1);
  }

  function compose(mode: "reply" | "replyAll" | "forward") {
    stashCompose(draftFromEmail(email, mode));
    router.push("/activities/emails/create");
  }

  function goBack() {
    router.push(backHref);
  }

  const timelineEvents = [
    {
      id: "1",
      title: email.status === "Opened" ? "Email Opened" : email.status,
      timestamp: email.openedDate || email.sentDate || "",
    },
    {
      id: "2",
      title: "Email Sent",
      timestamp: email.sentDate || "",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2">
          <Link href={backHref} className={toolBtn}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <ActivityTimelineButton
            href={`/activities/emails/detail/${email.id}/timeline`}
          />
          <button
            type="button"
            className={toolBtn}
            onClick={() => {
              setMailboxFlag(email.id, "archived", true);
              goBack();
            }}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
          <button
            type="button"
            className={toolBtn}
            onClick={() => {
              setMailboxFlag(email.id, "trash", true);
              goBack();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <div className="relative">
            <button
              type="button"
              className={toolBtn}
              onClick={() => setMoveOpen((v) => !v)}
            >
              <FolderInput className="h-3.5 w-3.5" />
              Move
              <ChevronDown className="h-3 w-3" />
            </button>
            {moveOpen ? (
              <div className="absolute top-9 left-0 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    moveToCustomFolder(email.id, null);
                    setMoveOpen(false);
                    refresh();
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  Inbox
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      moveToCustomFolder(email.id, folder.id);
                      setMoveOpen(false);
                      goBack();
                    }}
                    className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    {folder.name}
                  </button>
                ))}
                {folders.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-slate-400">
                    No folders yet — create one in Mail
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className={toolBtn}
            onClick={() => {
              updateEmail(email.id, { status: "Scheduled" });
              goBack();
            }}
          >
            <Clock className="h-3.5 w-3.5" />
            Snooze
          </button>
          <button
            type="button"
            className={toolBtn}
            onClick={() => {
              const unread = email.status === "Opened";
              updateEmail(email.id, { status: unread ? "Delivered" : "Opened" });
            }}
          >
            {email.status === "Opened" ? (
              <Mail className="h-3.5 w-3.5" />
            ) : (
              <MailOpen className="h-3.5 w-3.5" />
            )}
            {email.status === "Opened" ? "Mark unread" : "Mark read"}
          </button>
          <button
            type="button"
            className={cn(toolBtn, flags.pinned && "text-[#5A32A3]")}
            onClick={() => {
              toggleMailboxFlag(email.id, "pinned");
              refresh();
            }}
          >
            <Pin className={cn("h-3.5 w-3.5", flags.pinned && "fill-[#5A32A3]")} />
            Pin
          </button>
          <button
            type="button"
            className={cn(toolBtn, flags.important && "text-rose-600")}
            onClick={() => {
              toggleMailboxFlag(email.id, "important");
              refresh();
            }}
          >
            <Flag
              className={cn(
                "h-3.5 w-3.5",
                flags.important && "fill-[#e11d48] text-[#e11d48]",
              )}
            />
            Flag
          </button>
          <div className="relative">
            <button
              type="button"
              className={toolBtn}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              More
            </button>
            {moreOpen ? (
              <div className="absolute top-9 left-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMailboxFlag(email.id, "spam", true);
                    setMoreOpen(false);
                    goBack();
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  Move to spam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    router.push(meetingHref(email));
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  Create meeting
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteEmail(email.id);
                    setMoreOpen(false);
                    goBack();
                  }}
                  className="flex w-full px-3 py-1.5 text-left text-[12px] text-rose-600 hover:bg-rose-50"
                >
                  Delete forever
                </button>
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && router.push(`/activities/emails/detail/${prevId}`)}
              className={cn(toolBtn, !prevId && "opacity-40")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => nextId && router.push(`/activities/emails/detail/${nextId}`)}
              className={cn(toolBtn, !nextId && "opacity-40")}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              {email.subject || "(no subject)"}
            </h1>
            {labels.map((label) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  labelTone(label),
                )}
              >
                {label}
              </span>
            ))}
            {flags.important ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                Important
              </span>
            ) : null}
            {flags.pinned ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-[#5A32A3]">
                Pinned
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                avatarColor(who),
              )}
            >
              {initials(who)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900">
                {who}{" "}
                <span className="font-normal text-slate-500">&lt;{email.from}&gt;</span>
              </p>
              <p className="text-[12px] text-slate-500">To: {email.to.join(", ")}</p>
            </div>
            <p className="shrink-0 text-[12px] text-slate-400">{email.sentDate}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSummary(summariseEmail(email))}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <ListTree className="h-3.5 w-3.5 text-[#5A32A3]" />
              <Sparkles className="h-3 w-3 text-[#5A32A3]" />
              Summarise
            </button>
            <div className="relative" ref={emojiRef}>
              <button
                type="button"
                title={reaction ? `Reaction ${reaction}` : "React"}
                aria-label="Choose emoji reaction"
                onClick={() => setEmojiOpen((v) => !v)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100",
                  (emojiOpen || reaction) && "bg-amber-50 text-amber-600",
                )}
              >
                {reaction ? (
                  <span className="text-[15px] leading-none">{reaction}</span>
                ) : (
                  <Smile className="h-4 w-4" />
                )}
              </button>
              {emojiOpen ? (
                <div className="absolute top-10 left-0 z-40 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="mb-1.5 px-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Choose a reaction
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMAIL_REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        title={emoji}
                        onClick={() => {
                          setReaction((current) =>
                            current === emoji ? null : emoji,
                          );
                          setEmojiOpen(false);
                        }}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-[15px] hover:bg-violet-50",
                          reaction === emoji && "bg-violet-50 ring-1 ring-violet-200",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {reaction ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReaction(null);
                        setEmojiOpen(false);
                      }}
                      className="mt-1.5 w-full rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      Remove reaction
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              title="Reply"
              onClick={() => compose("reply")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <Reply className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Reply all"
              onClick={() => compose("replyAll")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <ReplyAll className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Forward"
              onClick={() => compose("forward")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <Forward className="h-4 w-4" />
            </button>
          </div>

          {summary ? (
            <div className="mt-4 rounded-xl border border-violet-100 bg-[#F8F4FC] px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#5A32A3]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Email Summary
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSummary(summariseEmail(email))}
                    className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5A32A3]"
                  >
                    Generate Summary
                  </button>
                  <button
                    type="button"
                    title="Remove summary"
                    aria-label="Remove summary"
                    onClick={() => setSummary(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[13px] leading-6 text-slate-600">{summary}</p>
            </div>
          ) : null}

          <div className="mt-6 max-w-3xl whitespace-pre-wrap text-[14px] leading-7 text-slate-700">
            {email.body}
          </div>

          {files.length > 0 ? (
            <div className="mt-8 border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                  <Paperclip className="h-3.5 w-3.5" />
                  {files.length} Attachment{files.length === 1 ? "" : "s"}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5A32A3]">
                  <Download className="h-3.5 w-3.5" />
                  Download All
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex min-w-[180px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white",
                        file.kind === "pdf" ? "bg-rose-500" : "bg-sky-500",
                      )}
                    >
                      {file.kind === "pdf" ? "PDF" : "IMG"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-slate-800">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{file.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-slate-200 bg-white p-6 lg:flex">
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Related CRM Profile
          </h3>
          <CrmProfileCard
            name={email.relatedTo || who}
            initials={initials(who)}
            role="Client / Lead"
            company="FinConnex"
            activeDeal={email.subject || "Related activity"}
          />
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Activity Timeline
          </h3>
          <ActivityTimeline events={timelineEvents} />
        </div>
      </aside>
    </div>
  );
}
