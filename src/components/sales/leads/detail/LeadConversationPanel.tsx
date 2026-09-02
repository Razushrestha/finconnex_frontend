"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileText,
  Filter,
  ImageIcon,
  Mail,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Pause,
  Phone,
  PhoneMissed,
  Play,
  Plus,
  Reply,
  RotateCcw,
  Search,
  Send,
  Smile,
  Sparkles,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { avatarColor, initials } from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  fetchLeadConversations,
  postLeadConversation,
} from "@/lib/leads/api";
import {
  addLeadConversationItem,
  formatDuration,
  listLeadConversation,
  onLeadActivityChange,
  type ConversationAttachment,
  type ConversationChannel,
  type ConversationItem,
} from "@/lib/leads/conversation-store";
import { createMeeting, formatMeetingDateTime } from "@/lib/meetings/store";
import { createMessage } from "@/lib/messages/store";
import type { LeadCardData } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { LeadComposerEmojiPicker } from "@/components/sales/leads/detail/LeadComposerEmojiPicker";

type ComposerChannel = "whatsapp" | "sms";

const CHANNELS: { id: ComposerChannel; label: string; icon: typeof Mail }[] =
  [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { id: "sms", label: "SMS", icon: MessageSquare },
  ];

const FILTERS: {
  id: ConversationChannel;
  label: string;
  icon: typeof Mail;
}[] = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "call", label: "Call", icon: Phone },
];

const TEMPLATES: Record<ComposerChannel, { label: string; body: string; subject?: string }[]> =
  {
    whatsapp: [
      { label: "Follow up", body: "Hi {name}, just checking you received the loan options?" },
      { label: "Book consult", body: "I have a time tomorrow at 10:00 AM — does that work?" },
    ],
    sms: [
      { label: "Follow up", body: "Hi {name}, following up on your home loan. Any questions?" },
      { label: "Docs", body: "Please send ID, payslips, and 3 months of statements when you can." },
    ],
  };

const CHAR_LIMIT: Record<ComposerChannel, number | null> = {
  sms: 160,
  whatsapp: 1024,
};

function formatDayLabel(iso: string) {
  const at = new Date(iso);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const rest = at.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (sameDay(at, today)) return `Today, ${rest}`;
  if (sameDay(at, yday)) return `Yesterday, ${rest}`;
  return rest;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function downloadAttachment(file: ConversationAttachment) {
  const blob = new Blob([`${file.name} (${file.size})`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function channelLabel(channel: ConversationChannel) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "sms") return "SMS";
  if (channel === "email") return "Email";
  return "Call";
}

function summarize(items: ConversationItem[], first: string) {
  const lastIn = [...items].reverse().find((item) => item.direction === "in");
  const lastOut = [...items].reverse().find((item) => item.direction === "out");
  if (!items.length) {
    return `No conversation yet with ${first}. Start on WhatsApp, SMS, or Email.`;
  }
  return `${first} is in conversation about loan options. Latest inbound: “${(lastIn?.body ?? "—").slice(0, 90)}”. Latest reply: “${(lastOut?.body ?? "—").slice(0, 90)}”.`;
}

export function LeadConversationPanel({ card }: { card: LeadCardData }) {
  const first = card.name.split(" ")[0] ?? card.name;
  const [revision, setRevision] = useState(0);
  const [remoteItems, setRemoteItems] = useState<ConversationItem[] | null>(
    null,
  );
  const [channelFilters, setChannelFilters] = useState<ConversationChannel[]>(
    [],
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("oldest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [composerChannel, setComposerChannel] =
    useState<ComposerChannel>("whatsapp");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [attachment, setAttachment] = useState<ConversationAttachment | null>(
    null,
  );
  const [sidebar, setSidebar] = useState(true);
  const [plusOpen, setPlusOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [fullEmail, setFullEmail] = useState<ConversationItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => onLeadActivityChange(() => setRevision((n) => n + 1)), []);

  useEffect(() => {
    if (!isUuid(card.id)) {
      setRemoteItems(null);
      return;
    }
    let cancelled = false;
    void fetchLeadConversations(card.id, { limit: 50 }).then((page) => {
      if (cancelled || !page) return;
      setRemoteItems(
        page.records.map((row) => ({
          id: row.id,
          leadId: card.id,
          channel: (["whatsapp", "sms", "email", "call"].includes(row.channel)
            ? row.channel
            : "sms") as ConversationChannel,
          kind:
            row.kind === "call"
              ? "call"
              : row.kind === "email"
                ? "email"
                : "text",
          direction:
            String(row.direction).toLowerCase() === "inbound" ||
            String(row.direction).toLowerCase() === "in"
              ? "in"
              : "out",
          fromName: row.fromName || card.owner,
          body: row.body,
          subject: row.subject,
          at:
            typeof row.at === "string"
              ? row.at
              : new Date(row.at).toISOString(),
          status: "sent",
          durationSeconds: row.durationSeconds,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [card.id, card.owner, revision]);

  useEffect(() => {
    if (!plusOpen && !emojiOpen) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (plusOpen && plusRef.current && !plusRef.current.contains(target)) {
        setPlusOpen(false);
        setTemplatesOpen(false);
      }
      if (emojiOpen && emojiRef.current && !emojiRef.current.contains(target)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [plusOpen, emojiOpen]);

  useEffect(() => {
    if (!fullEmail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullEmail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullEmail]);

  const items = useMemo(() => {
    void revision;
    if (remoteItems) return remoteItems;
    return listLeadConversation(card);
  }, [card, revision, remoteItems]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (
        channelFilters.length > 0 &&
        !channelFilters.includes(item.channel)
      ) {
        return false;
      }
      if (!q) return true;
      return `${item.body} ${item.subject ?? ""} ${item.fromName} ${item.attachment?.name ?? ""}`
        .toLowerCase()
        .includes(q);
    });
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.at).getTime() - new Date(b.at).getTime();
      return sortOrder === "oldest" ? diff : -diff;
    });
  }, [items, channelFilters, query, sortOrder]);

  const attachments = items.filter((item) => item.attachment).map((item) => item.attachment!);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTo({
      top: sortOrder === "oldest" ? el.scrollHeight : 0,
    });
  }, [visible.length, revision, sortOrder]);

  const limit = CHAR_LIMIT[composerChannel];
  const overLimit = limit != null && draft.length > limit;

  function toggleChannel(id: ConversationChannel) {
    setChannelFilters((prev) => {
      if (prev.length === 0) return [id];
      if (prev.includes(id)) return prev.filter((channel) => channel !== id);
      const next = [...prev, id];
      return next.length === FILTERS.length ? [] : next;
    });
  }

  function notify(text: string) {
    setFlash(text);
    window.setTimeout(() => setFlash(null), 2200);
  }

  function applyTemplate(body: string, nextSubject?: string) {
    setDraft(body.replaceAll("{name}", first));
    if (nextSubject) setSubject(nextSubject.replaceAll("{name}", first));
    setTemplatesOpen(false);
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    setAttachment({
      name: file.name,
      size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`,
    });
  }

  function send(schedule?: boolean) {
    const body = draft.trim();
    if (!body && !attachment) return;
    if (overLimit) return;
    if (schedule) {
      notify("Message scheduled");
      return;
    }

    const related = `Lead: ${card.name}`;
    createMessage({
      type: "External",
      subject:
        composerChannel === "whatsapp"
          ? `WhatsApp: ${card.name}`
          : body.slice(0, 48) || "SMS",
      body: body || attachment?.name || "",
      from: card.owner,
      to: card.phone || card.name,
      relatedTo: related,
      status: "Sent",
      template: composerChannel === "whatsapp" ? "WhatsApp" : undefined,
    });

    if (isUuid(card.id)) {
      void postLeadConversation(card.id, {
        channel: composerChannel,
        body: body || attachment?.name || "",
        subject:
          composerChannel === "whatsapp"
            ? `WhatsApp: ${card.name}`
            : undefined,
        send: true,
      })
        .then(() => setRevision((n) => n + 1))
        .catch((err) =>
          notify(err instanceof Error ? err.message : "Send failed"),
        );
    } else {
      addLeadConversationItem({
        leadId: card.id,
        channel: composerChannel,
        kind: "text",
        direction: "out",
        fromName: card.owner,
        body: body || attachment?.name || "",
        status: "read",
        attachment: attachment ?? undefined,
      });
    }
    setDraft("");
    setSubject("");
    setAttachment(null);
    notify("Message sent");
  }

  function sendVoice() {
    addLeadConversationItem({
      leadId: card.id,
      channel: composerChannel,
      kind: "voice",
      direction: "out",
      fromName: card.owner,
      body: "Voice message",
      status: "read",
      durationSeconds: 12,
    });
    notify("Voice recording sent");
  }

  function sendMeeting(kind: "schedule" | "now") {
    const now = new Date();
    const start =
      kind === "now"
        ? now
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const meeting = createMeeting({
      title:
        kind === "now"
          ? `Meet now with ${card.name}`
          : `Meeting with ${card.name}`,
      relatedTo: `Lead: ${card.name}`,
      type: "Video Call",
      startDateTime: formatMeetingDateTime(start),
      endDateTime: formatMeetingDateTime(end),
      organizer: card.owner,
      meetingLink: "",
      status: kind === "now" ? "In Progress" : "Scheduled",
    });
    const link = `https://meet.finconnex.com/${meeting.id}`;
    const when = start.toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const body =
      kind === "now"
        ? `Hi ${first}, jumping on a video call now. Join here: ${link}`
        : `Hi ${first}, I've scheduled a meeting for ${when}. Join here: ${link} — reply if you need a different time.`;
    const related = `Lead: ${card.name}`;
    createMessage({
      type: "External",
      subject:
        composerChannel === "whatsapp"
          ? `WhatsApp: ${card.name}`
          : body.slice(0, 48),
      body,
      from: card.owner,
      to: card.phone || card.name,
      relatedTo: related,
      status: "Sent",
      template: composerChannel === "whatsapp" ? "WhatsApp" : undefined,
    });
    addLeadConversationItem({
      leadId: card.id,
      channel: composerChannel,
      kind: "text",
      direction: "out",
      fromName: card.owner,
      body,
      status: "read",
    });
    notify(kind === "now" ? "Meet now sent" : "Meeting schedule sent");
  }

  let lastDay = "";

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium",
                filterOpen || channelFilters.length > 0 || sortOrder !== "oldest"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {channelFilters.length > 0 || sortOrder !== "oldest" ? (
                <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                  {channelFilters.length + Number(sortOrder !== "oldest")}
                </span>
              ) : null}
            </button>
            {filterOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close filter"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute top-9 left-0 z-30 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Channel
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => setChannelFilters([])}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]",
                        channelFilters.length === 0
                          ? "bg-emerald-50 font-semibold text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 items-center justify-center rounded border",
                          channelFilters.length === 0
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        {channelFilters.length === 0 ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : null}
                      </span>
                      All
                    </button>
                    {FILTERS.map((item) => {
                      const Icon = item.icon;
                      const on = channelFilters.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleChannel(item.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]",
                            on
                              ? "bg-emerald-50 font-semibold text-emerald-700"
                              : "text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 items-center justify-center rounded border",
                              on
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white",
                            )}
                          >
                            {on ? <Check className="h-2.5 w-2.5" /> : null}
                          </span>
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Sort by
                  </p>
                  {(
                    [
                      { id: "newest", label: "Newest" },
                      { id: "oldest", label: "Oldest" },
                    ] as const
                  ).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSortOrder(order.id)}
                      className={cn(
                        "flex w-full rounded-lg px-2 py-1.5 text-left text-[12px]",
                        sortOrder === order.id
                          ? "bg-emerald-50 font-semibold text-emerald-700"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {order.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in conversation..."
                className="h-8 w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[12px] outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setSidebar((v) => !v)}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Details
            </button>
          </div>
        </div>

        <div ref={threadRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[#F7F8FA] px-2.5 py-2">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-slate-400">
              No messages in this view.
            </p>
          ) : (
            visible.map((item) => {
              const day = formatDayLabel(item.at);
              const showDay = day !== lastDay;
              lastDay = day;
              const incoming = item.direction === "in";
              return (
                <div key={item.id}>
                  {showDay ? (
                    <p className="mb-1.5 text-center text-[11px] font-medium text-slate-400">
                      {day}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "flex items-start gap-2",
                      incoming ? "justify-start" : "justify-end",
                    )}
                  >
                    {incoming && item.channel !== "email" ? (
                      <SenderAvatar
                        name={item.fromName || card.name}
                        channel={item.channel}
                        kind={item.kind}
                      />
                    ) : null}
                    {item.kind === "email" || item.channel === "email" ? (
                      <EmailCard
                        item={item}
                        incoming={incoming}
                        expanded={expandedEmail === item.id}
                        onToggle={() =>
                          setExpandedEmail((id) =>
                            id === item.id ? null : item.id,
                          )
                        }
                        onOpenFull={() => setFullEmail(item)}
                      />
                    ) : (
                      <div className="min-w-0 max-w-[72%]">
                        {item.kind === "voice" || item.kind === "call" ? (
                          <VoiceCallCard
                            item={item}
                            playing={playingId === item.id}
                            onToggle={() =>
                              setPlayingId((id) =>
                                id === item.id ? null : item.id,
                              )
                            }
                          />
                        ) : (
                          <TextBubble item={item} />
                        )}
                        <MessageMeta
                          at={item.at}
                          align={incoming ? "start" : "end"}
                        />
                      </div>
                    )}
                    {!incoming && item.channel !== "email" ? (
                      <SenderAvatar
                        name={item.fromName || card.owner}
                        channel={item.channel}
                        kind={item.kind}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-2.5 py-1.5">
          <div className="rounded-xl border border-slate-200 bg-white px-2 pt-1 pb-1">
            {attachment ? (
              <div className="mb-1 flex items-center justify-between rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                <span className="truncate">
                  {attachment.name} · {attachment.size}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-slate-400"
                >
                  ×
                </button>
              </div>
            ) : null}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${card.name}...`}
              rows={1}
              className="h-7 w-full resize-none bg-transparent px-1 text-[12px] leading-snug text-slate-800 outline-none placeholder:text-slate-400"
            />
            <div className="relative flex items-center gap-0.5">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="relative" ref={plusRef}>
                <IconBtn
                  label="Add"
                  onClick={() => {
                    setPlusOpen((v) => !v);
                    setEmojiOpen(false);
                    setTemplatesOpen(false);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </IconBtn>
                {plusOpen ? (
                  <div className="absolute bottom-7 left-0 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        fileRef.current?.click();
                        setPlusOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach file
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fileRef.current?.click();
                        setPlusOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Attach image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplatesOpen((v) => !v);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Templates
                    </button>
                    {templatesOpen
                      ? TEMPLATES[composerChannel].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              applyTemplate(item.body, item.subject);
                              setPlusOpen(false);
                            }}
                            className="flex w-full px-8 py-1.5 text-left text-[11px] text-slate-500 hover:bg-slate-50"
                          >
                            {item.label}
                          </button>
                        ))
                      : null}
                    <button
                      type="button"
                      onClick={() => {
                        sendMeeting("schedule");
                        setPlusOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Schedule meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sendMeeting("now");
                        setPlusOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Meet now
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="relative" ref={emojiRef}>
                <IconBtn
                  label="Emoji"
                  onClick={() => {
                    setEmojiOpen((v) => !v);
                    setPlusOpen(false);
                  }}
                >
                  <Smile className="h-3.5 w-3.5" />
                </IconBtn>
                {emojiOpen ? (
                  <LeadComposerEmojiPicker
                    onPick={(emoji) => setDraft((value) => value + emoji)}
                    onClose={() => setEmojiOpen(false)}
                  />
                ) : null}
              </div>
              <div className="ml-1 inline-flex rounded-md bg-slate-100 p-0.5">
                {CHANNELS.map((item) => {
                  const Icon = item.icon;
                  const on = composerChannel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setComposerChannel(item.id)}
                      className={cn(
                        "inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium",
                        on && item.id === "whatsapp" && "bg-white text-[#25D366] shadow-sm",
                        on && item.id === "sms" && "bg-white text-[#5A32A3] shadow-sm",
                        !on && item.id === "whatsapp" && "text-[#25D366]/80 hover:text-[#25D366]",
                        !on && item.id === "sms" && "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {limit != null ? (
                <span
                  className={cn(
                    "ml-1 text-[10px]",
                    overLimit ? "font-semibold text-rose-500" : "text-slate-400",
                  )}
                >
                  {draft.length}/{limit}
                </span>
              ) : null}
              <div className="ml-auto flex items-center gap-0.5">
                <IconBtn label="Voice note" onClick={sendVoice}>
                  <Mic className="h-3.5 w-3.5" />
                </IconBtn>
                <button
                  type="button"
                  disabled={overLimit || (!draft.trim() && !attachment)}
                  onClick={() => send()}
                  className="inline-flex h-6 items-center gap-1 rounded-md bg-[#7C5CB5] px-2 text-[11px] font-semibold text-white hover:bg-[#5A32A3] disabled:opacity-40"
                >
                  Send
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[9px] text-slate-400">
            Shift+Enter for new line · Voice notes
          </p>
        </div>
      </section>

      {sidebar ? (
        <aside className="min-h-0 space-y-3 overflow-y-auto">
          <SideCard title="Recent Attachments">
            {attachments.length === 0 ? (
              <p className="text-[12px] text-slate-400">No attachments yet.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((file) => (
                  <li key={file.name}>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(file)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-2.5 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-bold text-rose-600">
                          PDF
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-slate-800">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400">{file.size}</span>
                        </span>
                      </span>
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>

          <SideCard
            title={
              <span className="inline-flex items-center gap-1.5">
                Conversation Summary
                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  AI
                </span>
              </span>
            }
          >
            <p className="text-[12px] leading-relaxed text-slate-600">
              {summarize(items, first)}
            </p>
          </SideCard>
        </aside>
      ) : null}

      {fullEmail ? (
        <EmailFullPage item={fullEmail} onClose={() => setFullEmail(null)} />
      ) : null}

      {flash ? (
        <div className="fixed right-5 bottom-16 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] text-white shadow-lg">
          {flash}
        </div>
      ) : null}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      {children}
    </button>
  );
}

function SideCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="mb-2.5 text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}

function SenderAvatar({
  name,
  channel,
  kind,
  ring = "ring-[#F7F8FA]",
}: {
  name: string;
  channel: ConversationChannel;
  kind?: ConversationItem["kind"];
  ring?: string;
}) {
  const BadgeIcon =
    kind === "voice"
      ? Mic
      : channel === "call"
        ? Phone
        : channel === "email"
          ? Send
          : channel === "whatsapp"
            ? MessageCircle
            : MessageSquare;
  const badgeClass =
    channel === "whatsapp"
      ? "bg-emerald-500"
      : channel === "call" || kind === "voice"
        ? "bg-slate-800"
        : "bg-sky-500";
  return (
    <span title={`${name} · ${channelLabel(channel)}`} className="relative shrink-0">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
          avatarColor(name),
        )}
      >
        {initials(name)}
      </span>
      <span
        className={cn(
          "absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white ring-2",
          ring,
          badgeClass,
        )}
      >
        <BadgeIcon className="h-2.5 w-2.5" />
      </span>
    </span>
  );
}

function MessageMeta({
  at,
  align,
}: {
  at: string;
  align: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "mt-0.5 flex items-center gap-0.5 text-[10px] text-slate-400",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <span>{formatTime(at)}</span>
      <button
        type="button"
        aria-label="Message options"
        className="rounded p-0.5 hover:bg-slate-200/70 hover:text-slate-600"
      >
        <MoreVertical className="h-3 w-3" />
      </button>
    </div>
  );
}

function TextBubble({ item }: { item: ConversationItem }) {
  return (
    <div className="rounded-lg bg-[#F4F6FE] px-2.5 py-1.5 text-[14px] leading-relaxed text-slate-800">
      {item.body ? <p className="whitespace-pre-wrap">{item.body}</p> : null}
      {item.attachment ? (
        <button
          type="button"
          onClick={() => downloadAttachment(item.attachment!)}
          className="mt-1.5 flex w-full items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1.5 text-left"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-[8px] font-bold text-rose-600">
            PDF
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium">
              {item.attachment.name}
            </span>
            <span className="text-[9px] text-slate-400">{item.attachment.size}</span>
          </span>
          <Download className="h-3 w-3 text-slate-400" />
        </button>
      ) : null}
    </div>
  );
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={`${part}-${i}`}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sky-600 underline"
      >
        {part}
      </a>
    ) : (
      <span key={`${part}-${i}`}>{part}</span>
    ),
  );
}

function EmailCard({
  item,
  incoming,
  expanded,
  onToggle,
  onOpenFull,
}: {
  item: ConversationItem;
  incoming: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenFull: () => void;
}) {
  const snippet = (item.body || "").replace(/\s+/g, " ").trim();
  return (
    <div
      className={cn(
        "w-full max-w-[80%] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
        incoming ? "" : "ml-auto",
      )}
    >
      <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">
          {item.subject || "(No subject)"}
        </p>
        <button
          type="button"
          onClick={onOpenFull}
          aria-label="Open email full page"
          className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse email" : "Expand email in conversation"}
          className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>
      <div className="px-2 py-1.5">
        <div className="flex items-start gap-1.5">
          <SenderAvatar
            name={item.fromName}
            channel="email"
            kind="email"
            ring="ring-white"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="min-w-0 truncate text-[13px] font-semibold text-slate-800">
                {item.fromName}
              </p>
              <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                {formatTime(item.at)}
              </span>
              <button
                type="button"
                aria-label="Reply"
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Reply className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Email options"
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreVertical className="h-3 w-3" />
              </button>
            </div>
            {item.toEmail ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                To {item.toEmail}
                <Mail className="h-2.5 w-2.5 text-sky-500" />
              </p>
            ) : item.fromEmail ? (
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {item.fromEmail}
              </p>
            ) : null}
            {!expanded && snippet ? (
              <p className="mt-0.5 truncate text-[13px] text-slate-500">
                {snippet}
              </p>
            ) : null}
          </div>
        </div>
        {expanded ? (
          <div className="mt-2">
            {item.body ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700">
                {linkify(item.body)}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">No email body.</p>
            )}
            {item.attachment ? (
              <button
                type="button"
                onClick={() => downloadAttachment(item.attachment!)}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50 text-[8px] font-bold text-rose-600">
                  PDF
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-slate-800">
                    {item.attachment.name}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {item.attachment.size}
                  </span>
                </span>
                <Download className="h-3 w-3 text-slate-400" />
              </button>
            ) : null}
            <button
              type="button"
              className="mt-2 inline-flex h-7 items-center gap-1 rounded-md bg-sky-500 px-2.5 text-[11px] font-semibold text-white hover:bg-sky-600"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmailFullPage({
  item,
  onClose,
}: {
  item: ConversationItem;
  onClose: () => void;
}) {
  const sent = `${formatDayLabel(item.at)} · ${formatTime(item.at)}`;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#F7F6F9]">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
          Back to conversation
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4a2888]"
        >
          <Reply className="h-3.5 w-3.5" />
          Reply
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <article className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Email
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {item.subject || "(No subject)"}
          </h1>
          <div className="mt-4 flex items-start gap-3 border-b border-slate-100 pb-4">
            <SenderAvatar
              name={item.fromName}
              channel="email"
              kind="email"
              ring="ring-white"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-800">
                {item.fromName}
              </p>
              {item.fromEmail ? (
                <p className="text-[12px] text-slate-500">{item.fromEmail}</p>
              ) : null}
              {item.toEmail ? (
                <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                  To {item.toEmail}
                  <Mail className="h-3 w-3 text-sky-500" />
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-[12px] text-slate-400">{sent}</p>
          </div>
          <div className="mt-5 text-[14px] leading-relaxed text-slate-700">
            {item.body ? (
              <p className="whitespace-pre-wrap">{linkify(item.body)}</p>
            ) : (
              <p className="text-slate-400">No email body.</p>
            )}
          </div>
          {item.attachment ? (
            <button
              type="button"
              onClick={() => downloadAttachment(item.attachment!)}
              className="mt-6 flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-bold text-rose-600">
                PDF
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-800">
                  {item.attachment.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {item.attachment.size}
                </span>
              </span>
              <Download className="h-4 w-4 text-slate-400" />
            </button>
          ) : null}
        </article>
      </div>
    </div>,
    document.body,
  );
}

const WAVE_BARS = [
  8, 14, 6, 18, 11, 16, 5, 20, 12, 9, 17, 7, 15, 19, 8, 13, 10, 16, 6, 14, 18,
  9, 12, 7, 15, 20, 8, 11, 16, 5, 13, 17, 10, 14, 8, 19, 12, 6, 15,
];

function VoiceCallCard({
  item,
  playing,
  onToggle,
}: {
  item: ConversationItem;
  playing: boolean;
  onToggle: () => void;
}) {
  const missed = item.callOutcome === "missed";
  const call = item.kind === "call" || item.channel === "call";
  const total = formatDuration(item.durationSeconds);
  const hasRecording = !missed && (item.durationSeconds ?? 0) > 0;

  return (
    <div className="min-w-[260px] rounded-xl bg-[#F4F6FE] px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium text-slate-700">
        {missed ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
            <PhoneMissed className="h-2.5 w-2.5" />
          </span>
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        {missed
          ? "Missed call"
          : call
            ? "Call completed"
            : "Voice recording"}
      </p>
      {hasRecording ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? "Pause recording" : "Play recording"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="ml-px h-3.5 w-3.5" />
            )}
          </button>
          <div className="flex h-6 min-w-0 flex-1 items-center gap-px">
            {WAVE_BARS.slice(0, 32).map((h, i) => (
              <span
                key={`${item.id}-bar-${i}`}
                className={cn(
                  "w-0.5 rounded-full",
                  playing && i < 10 ? "bg-blue-500" : "bg-slate-300",
                )}
                style={{ height: `${Math.max(6, Math.round(h * 0.75))}px` }}
              />
            ))}
          </div>
          <span className="shrink-0 text-right text-[11px] leading-tight text-slate-500 tabular-nums">
            {playing ? "0:04" : "0:00"}
            <br />
            {total}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-slate-500">1x</span>
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <RotateCcw className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <button
            type="button"
            aria-label="Download recording"
            onClick={() =>
              downloadAttachment({
                name: `${call ? "Call" : "Voice"}-${item.id}.mp3`,
                size: total,
              })
            }
            className="text-slate-400 hover:text-slate-600"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : missed ? (
        <p className="text-[11px] text-slate-500">No recording · lead did not pick up</p>
      ) : (
        <p className="text-[11px] text-slate-500">No recording available</p>
      )}
    </div>
  );
}
