"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import Link from "next/link";
import {
    Inbox,
  Search,
  Send,
  Settings,
  UserPlus,
  Tag,
  Archive,
  CheckCheck,
  StickyNote,
  Link2,
  ChevronDown,
  Smile,
  AtSign,
  Reply,
  X,
  ImageIcon,
  Paperclip,
  Mic,
} from "lucide-react";
import {
  INBOX_AGENTS,
  INBOX_CHANNELS,
  INBOX_STATUSES,
  QUICK_REPLIES,
  formatInboxAt,
  listInboxConversations,
  upsertInboxConversation,
  type InboxChannel,
  type InboxConversation,
  type InboxMessage,
  type InboxAttachment,
  type InboxStatus,
} from "@/lib/marketing/inbox/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { listMentionPeople } from "@/lib/mentions/people";
import { notifyMention } from "@/lib/rules/notify";
import { cn } from "@/lib/utils";

const CHANNEL_DOT: Record<InboxChannel, string> = {
  "Facebook Messenger": "bg-blue-500",
  "Instagram DM": "bg-pink-500",
  WhatsApp: "bg-emerald-500",
  SMS: "bg-sky-500",
};

const CHANNEL_SOFT: Record<InboxChannel, string> = {
  "Facebook Messenger": "bg-blue-50 text-blue-700",
  "Instagram DM": "bg-pink-50 text-pink-700",
  WhatsApp: "bg-emerald-50 text-emerald-700",
  SMS: "bg-sky-50 text-sky-700",
};

const STATUS_STYLE: Record<InboxStatus, string> = {
  Open: "bg-sky-50 text-sky-700",
  Pending: "bg-amber-50 text-amber-800",
  Resolved: "bg-emerald-50 text-emerald-700",
};

type InboxListFilter = InboxStatus | "Read" | "Online" | "Offline" | "All";

const LIST_FILTERS: { id: Exclude<InboxListFilter, "All">; label: string }[] = [
  { id: "Open", label: "Open" },
  { id: "Pending", label: "Pending" },
  { id: "Resolved", label: "Resolved" },
  { id: "Read", label: "Marked as read" },
  { id: "Online", label: "Online" },
  { id: "Offline", label: "Offline" },
];

const EMOJI_CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "😉", "😍", "🥰", "😘", "😗", "😋", "😜", "🤪", "😝",
      "🤑", "🤗", "🤭", "🤫", "🤔", "😐", "😑", "😶", "🙄", "😏",
      "😣", "😥", "😮", "🤐", "😯", "😪", "😫", "🥱", "😴", "😌",
      "😛", "😒", "😓", "😔", "😕", "🙃", "🫠", "🙁", "😖", "😞",
      "😟", "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬",
      "😰", "😱", "🥵", "🥶", "😳", "🥺", "🥹", "🤠", "🥳", "😎",
      "🤓", "🧐", "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "✨",
      "⭐", "🌟", "💫", "🔥", "💯", "✅", "✔️", "❌", "⚠️", "🎉",
      "🎊", "🎈", "🏆", "🥇", "🎯", "📌", "🔔", "💡", "⚡", "🌈",
    ],
  },
  {
    id: "people",
    label: "People",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "👈", "👉",
      "👆", "👇", "☝️", "🫵", "✊", "👊", "🤛", "🤜", "🫶", "👐",
      "🤲", "🙌", "👏", "🤞", "🤟", "🤘", "🤙", "💅", "🤳", "💃",
      "🕺", "🧑‍💻", "👩‍💻", "👨‍💻", "🧑‍💼", "👩‍💼", "👨‍💼", "🙋", "💁", "🙇",
    ],
  },
  {
    id: "work",
    label: "Work",
    emojis: [
      "📅", "📆", "🗂️", "📁", "📂", "📄", "📝", "✏️", "📌", "📎",
      "💼", "💻", "🖥️", "📱", "☎️", "📞", "📧", "📩", "📬", "📨",
      "🔗", "📊", "📈", "📉", "💰", "💵", "🏦", "🏠", "🏢", "🔑",
      "🔒", "🗓️", "⏱️", "⏰", "⌛", "🔎", "📋", "✅", "☑️", "📍",
    ],
  },
  {
    id: "extra",
    label: "More",
    emojis: [
      "☀️", "🌙", "⭐", "🌸", "🌺", "🍀", "🌿", "🌍", "☕", "🍵",
      "🥐", "🍕", "🍰", "🎂", "🍾", "🥂", "🚗", "✈️", "🚀", "🏡",
      "🎁", "📸", "🎥", "🎵", "🎶", "💬", "💭", "👀", "🙈", "🙌",
      "🤝", "🫶", "💙", "💚", "🧡", "❤️‍🔥", "🫡", "🤷", "🤦", "😴",
    ],
  },
];

export function UnifiedInboxClient() {
  const [rows, setRows] = useState<InboxConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<InboxChannel | "All">(
    "All",
  );
  const [statusFilter, setStatusFilter] = useState<InboxListFilter>("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [pendingFiles, setPendingFiles] = useState<InboxAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = listInboxConversations();
    setRows(list);
    const firstOpen = list.find((c) => !c.archived) ?? list[0];
    if (firstOpen) {
      setActiveId(firstOpen.id);
      setNotesDraft(firstOpen.notes);
    }
  }, []);

  const active = rows.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (active) setNotesDraft(active.notes);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, active?.messages.length]);

  useEffect(() => {
    setReplyTo(null);
    setDraft("");
    setEmojiOpen(false);
    setPendingFiles([]);
    setRecording(false);
  }, [activeId]);

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

  const mentionPeople = useMemo(() => {
    const merged = [...listMentionPeople()];
    const seen = new Set(merged.map((p) => p.name.toLowerCase()));
    const extras = [
      ...INBOX_AGENTS.filter((name) => name !== "Unassigned").map((name) => ({
        id: `agent-${name}`,
        name,
        role: "Agent",
      })),
      ...(active?.contactName
        ? [
            {
              id: `contact-${active.id}`,
              name: active.contactName,
              role: "Contact",
            },
          ]
        : []),
    ];
    for (const person of extras) {
      if (seen.has(person.name.toLowerCase())) continue;
      seen.add(person.name.toLowerCase());
      merged.push(person);
    }
    return merged;
  }, [active?.id, active?.contactName]);

  const channelCounts = useMemo(() => {
    const map = Object.fromEntries(INBOX_CHANNELS.map((c) => [c, 0])) as Record<
      InboxChannel,
      number
    >;
    for (const r of rows) {
      if (!r.archived) map[r.channel] += 1;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows.filter((c) => (showArchived ? c.archived : !c.archived));
    if (channelFilter !== "All")
      data = data.filter((c) => c.channel === channelFilter);
    if (statusFilter === "Open" || statusFilter === "Pending" || statusFilter === "Resolved")
      data = data.filter((c) => c.status === statusFilter);
    else if (statusFilter === "Read")
      data = data.filter((c) => c.unreadCount === 0);
    else if (statusFilter === "Online")
      data = data.filter((c) => c.online);
    else if (statusFilter === "Offline")
      data = data.filter((c) => !c.online);
    if (agentFilter !== "All")
      data = data.filter((c) => c.assignedAgent === agentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q) ||
          c.conversationId.toLowerCase().includes(q) ||
          (c.relatedTo?.toLowerCase().includes(q) ?? false) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return data;
  }, [rows, channelFilter, statusFilter, agentFilter, search, showArchived]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function persist(next: InboxConversation) {
    upsertInboxConversation(next);
    setRows((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }

  function selectConversation(id: string) {
    setActiveId(id);
    const c = rows.find((x) => x.id === id);
    if (c && c.unreadCount > 0) {
      persist({ ...c, unreadCount: 0 });
    }
  }

  function sendReply() {
    if (!active) return;
    const body = draft.trim();
    if (!body && pendingFiles.length === 0) return;
    const author =
      active.assignedAgent === "Unassigned" ? "You" : active.assignedAgent;
    const hasVoice = pendingFiles.some((f) => f.kind === "voice");
    const lastPreview =
      body ||
      (hasVoice
        ? "Voice note"
        : pendingFiles.some((f) => f.kind === "image")
          ? "Photo"
          : pendingFiles[0]?.name ?? "Attachment");
    const msg: InboxMessage = {
      id: `m-${Date.now()}`,
      body: body || lastPreview,
      at: formatInboxAt(),
      outbound: true,
      author,
      replyToId: replyTo?.id,
      replyToPreview: replyTo
        ? `${replyTo.author}: ${replyTo.body.slice(0, 60)}`
        : undefined,
      kind: hasVoice && !body ? "voice" : "text",
      voiceDurationSec: pendingFiles.find((f) => f.kind === "voice")
        ?.durationSec,
      attachments: pendingFiles.length ? pendingFiles : undefined,
    };
    persist({
      ...active,
      messages: [...active.messages, msg],
      lastMessage: lastPreview,
      timestamp: msg.at,
      unreadCount: 0,
    });
    const mentioned = mentionPeople
      .filter((p) =>
        body.toLowerCase().includes(`@${p.name.toLowerCase()}`),
      )
      .map((p) => p.name);
    for (const name of mentioned) {
      notifyMention({
        recipient: name,
        from: author,
        preview: body,
        relatedTo: active.contactName,
        relatedHref: "/marketing/inbox",
      });
    }
    setDraft("");
    setPendingFiles([]);
    setReplyTo(null);
    setEmojiOpen(false);
    setRecording(false);
    flash(
      mentioned.length
        ? `Reply sent · mentioned ${mentioned.join(", ")}`
        : `Reply sent via ${active.channel}`,
    );
  }

  function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addPickedFiles(files: FileList | null, kind: "image" | "file") {
    if (!files?.length) return;
    const next: InboxAttachment[] = [];
    const jobs: Promise<void>[] = [];
    for (const [index, file] of Array.from(files).slice(0, 6).entries()) {
      const att: InboxAttachment = {
        id: `att-${Date.now()}-${index}-${file.name}`,
        name: file.name,
        sizeLabel: formatBytes(file.size),
        mimeType: file.type || "application/octet-stream",
        kind: kind === "image" || file.type.startsWith("image/") ? "image" : "file",
      };
      if (att.kind === "image" && file.size <= 750 * 1024) {
        jobs.push(
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") att.url = reader.result;
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          }),
        );
      }
      next.push(att);
    }
    void Promise.all(jobs).then(() => {
      setPendingFiles((prev) => [...prev, ...next].slice(0, 8));
    });
    setEmojiOpen(false);
  }

  function toggleVoice() {
    if (recording) {
      setRecording(false);
      const duration = 6 + Math.floor(Math.random() * 8);
      setPendingFiles((prev) => [
        ...prev,
        {
          id: `voice-${Date.now()}`,
          name: "Voice note",
          sizeLabel: `${duration}s`,
          mimeType: "audio/webm",
          kind: "voice",
          durationSec: duration,
        },
      ]);
      flash("Voice note attached");
      return;
    }
    setRecording(true);
    setEmojiOpen(false);
    flash("Recording… tap mic again to attach");
  }

  function insertComposerText(text: string) {
    const el = composerRef.current;
    if (!el) {
      setDraft((d) => d + text);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + text + draft.slice(end);
    const cursor = start + text.length;
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function startMention() {
    const el = composerRef.current;
    const needsSpace =
      draft.length > 0 && !/\s$/.test(draft.slice(0, el?.selectionStart ?? draft.length));
    insertComposerText(needsSpace ? " @" : "@");
    setEmojiOpen(false);
  }

  function insertQuickReply(text: string) {
    setDraft(text);
  }

  function assignAgent(agent: string) {
    if (!active) return;
    persist({ ...active, assignedAgent: agent });
    flash(`Assigned to ${agent}`);
  }

  function setStatus(status: InboxStatus) {
    if (!active) return;
    persist({ ...active, status });
    flash(`Status → ${status}`);
  }

  function saveNotes() {
    if (!active) return;
    persist({ ...active, notes: notesDraft });
    flash("Notes saved");
  }

  function addTag() {
    if (!active || !tagDraft.trim()) return;
    const tag = tagDraft.trim().toLowerCase();
    if (active.tags.includes(tag)) return;
    persist({ ...active, tags: [...active.tags, tag] });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    if (!active) return;
    persist({ ...active, tags: active.tags.filter((t) => t !== tag) });
  }

  function toggleRead() {
    if (!active) return;
    persist({
      ...active,
      unreadCount: active.unreadCount > 0 ? 0 : 1,
    });
  }

  function archive() {
    if (!active) return;
    persist({ ...active, archived: true, status: "Resolved" });
    flash("Conversation archived");
    const next = filtered.find((c) => c.id !== active.id);
    setActiveId(next?.id ?? null);
  }

  function linkLead() {
    if (!active) return;
    if (active.relatedTo) {
      flash(`Already linked · ${active.relatedTo}`);
      return;
    }
    persist({
      ...active,
      relatedTo: `Lead: ${active.contactName}`,
    });
    flash(`Linked Lead: ${active.contactName}`);
  }

  function createLead() {
    if (!active) return;
    persist({
      ...active,
      relatedTo: `Lead: ${active.contactName}`,
      tags: active.tags.includes("new-lead")
        ? active.tags
        : [...active.tags, "new-lead"],
    });
    flash(`Lead created · ${active.contactName}`);
  }

  const unreadTotal = rows
    .filter((c) => !c.archived)
    .reduce((n, c) => n + c.unreadCount, 0);

  return (
    <div className="flex min-h-0 min-h-full w-full flex-1 flex-col overflow-hidden bg-slate-50 p-2 pr-3">
      <div className="w-full shrink-0 border-b border-slate-200/80 bg-background">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-1 py-2 sm:gap-x-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              Inbox
            </h1>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                {unreadTotal} unread
              </span>
            ) : null}
          </div>
          <Link
            href="/marketing/inbox/settings"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" />
            Channels
          </Link>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {/* Conversation list */}
        <div className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-slate-100 sm:max-w-[360px]">
          <div className="space-y-2 border-b border-slate-100 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-8 w-full rounded-md border border-slate-200/90 bg-white pr-2.5 pl-8 text-[12px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={agentFilter}
                onChange={setAgentFilter}
                ariaLabel="Filter by agent"
              >
                <option value="All">All agents</option>
                {INBOX_AGENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                value={channelFilter}
                onChange={(v) =>
                  setChannelFilter(v as InboxChannel | "All")
                }
                ariaLabel="Filter by channel"
              >
                <option value="All">All channels</option>
                {INBOX_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                    {channelCounts[ch] ? ` (${channelCounts[ch]})` : ""}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {LIST_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setStatusFilter(statusFilter === f.id ? "All" : f.id)
                  }
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    statusFilter === f.id
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-400 hover:bg-slate-50",
                  )}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                  showArchived
                    ? "bg-slate-200 text-slate-800"
                    : "text-slate-400 hover:bg-slate-50",
                )}
              >
                <Archive className="h-3 w-3" />
                {showArchived ? "Hide archived" : "Archived"}
              </button>
            </div>
          </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    "flex w-full gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left transition-colors",
                    activeId === c.id
                      ? "bg-violet-50/70"
                      : "hover:bg-slate-50/80",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      CHANNEL_DOT[c.channel],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold text-slate-900">
                        <span className="truncate">{c.contactName}</span>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            c.online ? "bg-emerald-500" : "bg-slate-300",
                          )}
                          title={c.online ? "Online" : "Offline"}
                        />
                      </p>
                      {c.unreadCount > 0 ? (
                        <span className="rounded-full bg-violet-600 px-1.5 text-[9px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {c.lastMessage}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1 py-px text-[9px] font-semibold",
                          CHANNEL_SOFT[c.channel],
                        )}
                      >
                        {c.channel.split(" ")[0]}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {c.timestamp}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="px-4 py-12 text-center text-[12px] text-slate-400">
                  No conversations match.
                </p>
              ) : null}
            </div>
          </div>

          {/* Thread pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <Inbox className="mb-2 h-10 w-10 text-slate-300" />
                <p className="text-[13px]">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-bold text-slate-900">
                        {active.contactName}
                      </h2>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          CHANNEL_SOFT[active.channel],
                        )}
                      >
                        {active.channel}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_STYLE[active.status],
                        )}
                      >
                        {active.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {active.conversationId}
                      {active.relatedTo ? ` · ${active.relatedTo}` : ""}
                      {" · "}
                      {active.assignedAgent}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <IconBtn
                      title="Mark read/unread"
                      onClick={toggleRead}
                      icon={CheckCheck}
                    />
                    <IconBtn title="Archive" onClick={archive} icon={Archive} />
                    <IconBtn
                      title="Link lead"
                      onClick={linkLead}
                      icon={Link2}
                    />
                    <IconBtn
                      title="Create lead"
                      onClick={createLead}
                      icon={UserPlus}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase">
                    Assign
                    <select
                      value={active.assignedAgent}
                      onChange={(e) => assignAgent(e.target.value)}
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold normal-case text-slate-700 outline-none"
                    >
                      {INBOX_AGENTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase">
                    Status
                    <select
                      value={active.status}
                      onChange={(e) => setStatus(e.target.value as InboxStatus)}
                      className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold normal-case text-slate-700 outline-none"
                    >
                      {INBOX_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    {active.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => removeTag(t)}
                        className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
                        title="Remove tag"
                      >
                        #{t} ×
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-slate-400" />
                      <input
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add tag"
                        className="h-7 w-20 rounded-md border border-slate-200 px-1.5 text-[11px] outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                <div
                  ref={feedRef}
                  className="min-h-0 flex-1 space-y-3 overflow-auto bg-slate-50/40 px-4 py-4"
                >
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "group flex gap-2",
                        m.outbound ? "justify-end" : "justify-start",
                      )}
                    >
                      {!m.outbound ? (
                        <span
                          className={cn(
                            "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                            avatarColor(m.author),
                          )}
                        >
                          {initials(m.author)}
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "relative max-w-[75%]",
                          m.outbound ? "items-end" : "items-start",
                        )}
                      >
                        {m.replyToPreview ? (
                          <div
                            className={cn(
                              "mb-1 truncate rounded-lg border px-2 py-1 text-[11px]",
                              m.outbound
                                ? "border-violet-400/40 bg-violet-500/25 text-violet-50"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                            )}
                          >
                            {m.replyToPreview}
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2 shadow-sm",
                            m.outbound
                              ? "rounded-br-md bg-violet-600 text-white"
                              : "rounded-bl-md border border-slate-100 bg-white text-slate-800",
                          )}
                        >
                          {m.attachments?.length ? (
                            <InboxMessageMedia
                              attachments={m.attachments}
                              outbound={m.outbound}
                            />
                          ) : null}
                          {m.body &&
                          !(
                            m.attachments?.length &&
                            (m.body === "Voice note" ||
                              m.body === "Photo" ||
                              m.attachments.some((a) => a.name === m.body))
                          ) ? (
                            <InboxMessageText
                              text={m.body}
                              outbound={m.outbound}
                              names={mentionPeople.map((p) => p.name)}
                            />
                          ) : null}
                          <div
                            className={cn(
                              "mt-1 flex items-center gap-2 text-[9px]",
                              m.outbound ? "text-violet-200" : "text-slate-400",
                            )}
                          >
                            <span>
                              {m.at} · {m.author}
                              {m.outbound ? ` · via ${active.channel}` : ""}
                            </span>
                            <button
                              type="button"
                              title={`Reply to ${m.author}`}
                              onClick={() => {
                                setReplyTo(m);
                                setEmojiOpen(false);
                                requestAnimationFrame(() =>
                                  composerRef.current?.focus(),
                                );
                              }}
                              className={cn(
                                "inline-flex items-center gap-0.5 font-semibold opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100",
                                m.outbound
                                  ? "text-white hover:text-violet-100"
                                  : "text-violet-600 hover:text-violet-800",
                              )}
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 bg-white p-3">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => insertQuickReply(q)}
                        className="max-w-[200px] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  {replyTo ? (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-[12px] text-violet-800">
                      <span className="min-w-0 truncate">
                        Replying to {replyTo.author}: {replyTo.body.slice(0, 72)}
                      </span>
                      <button
                        type="button"
                        aria-label="Cancel reply"
                        onClick={() => setReplyTo(null)}
                        className="rounded p-0.5 hover:bg-violet-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                  {pendingFiles.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {pendingFiles.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                        >
                          {f.kind === "image" && f.url ? (
                            <img
                              src={f.url}
                              alt=""
                              className="h-6 w-6 rounded object-cover"
                            />
                          ) : f.kind === "voice" ? (
                            <Mic className="h-3.5 w-3.5 text-violet-600" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="max-w-[140px] truncate">
                            {f.name}
                          </span>
                          <span className="text-slate-400">{f.sizeLabel}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.name}`}
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter((x) => x.id !== f.id),
                              )
                            }
                            className="rounded p-0.5 hover:bg-slate-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 focus-within:border-violet-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
                    <MentionTextarea
                      ref={composerRef}
                      value={draft}
                      onChange={setDraft}
                      people={mentionPeople}
                      menuTitle="Mention"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder={
                        replyTo
                          ? `Reply to ${replyTo.author} on ${active.channel}… Type @ to mention`
                          : `Reply on ${active.channel}… Type @ to mention`
                      }
                      rows={2}
                      className="max-h-28 min-h-[40px] w-full resize-none bg-transparent px-3 py-2.5 text-[13px] outline-none placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between gap-2 px-2 pb-2">
                      <div className="relative flex items-center gap-0.5" ref={emojiRef}>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            addPickedFiles(e.target.files, "image");
                            e.target.value = "";
                          }}
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            addPickedFiles(e.target.files, "file");
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          title="Emoji"
                          aria-label="Insert emoji"
                          onClick={() => setEmojiOpen((v) => !v)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                            emojiOpen && "bg-violet-50 text-violet-700",
                          )}
                        >
                          <Smile className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Mention someone"
                          aria-label="Mention someone"
                          onClick={startMention}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <AtSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Attach image"
                          aria-label="Attach image"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Attach file"
                          aria-label="Attach file"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={recording ? "Stop and attach voice note" : "Voice note"}
                          aria-label={recording ? "Stop recording" : "Record voice note"}
                          onClick={toggleVoice}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            recording
                              ? "bg-rose-50 text-rose-600"
                              : "text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                          )}
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                        {emojiOpen ? (
                          <InboxEmojiPicker
                            category={emojiCategory}
                            onCategory={setEmojiCategory}
                            onPick={(emoji) => {
                              insertComposerText(emoji);
                              composerRef.current?.focus();
                            }}
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={!draft.trim() && pendingFiles.length === 0}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes rail */}
          {active ? (
            <aside className="hidden w-[220px] shrink-0 flex-col border-l border-slate-100 bg-slate-50/50 xl:flex">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  <StickyNote className="h-3 w-3" />
                  Notes
                </p>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <MentionTextarea
                  value={notesDraft}
                  onChange={setNotesDraft}
                  placeholder="Conversation-level notes… Type @ to assign someone."
                  className="min-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 bg-white p-2.5 text-[12px] outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={saveNotes}
                  className="mt-2 h-8 rounded-lg bg-white text-[11px] font-semibold text-violet-700 ring-1 ring-slate-200 hover:bg-violet-50"
                >
                  Save notes
                </button>
                <div className="mt-4 space-y-1.5 text-[11px] text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-400">Email:</span>{" "}
                    {active.contactEmail ?? ""}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-400">
                      Related:
                    </span>{" "}
                    {active.relatedTo ?? "Not linked"}
                  </p>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function InboxMessageMedia({
  attachments,
  outbound,
}: {
  attachments: InboxAttachment[];
  outbound: boolean;
}) {
  return (
    <div className="mb-1.5 space-y-1.5">
      {attachments.map((att) => {
        if (att.kind === "image") {
          return att.url ? (
            <img
              key={att.id}
              src={att.url}
              alt={att.name}
              className="max-h-40 max-w-full rounded-lg object-cover"
            />
          ) : (
            <div
              key={att.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                outbound ? "bg-white/15" : "bg-slate-50",
              )}
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{att.name}</span>
            </div>
          );
        }
        if (att.kind === "voice") {
          return (
            <div
              key={att.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium",
                outbound ? "bg-white/15" : "bg-slate-50",
              )}
            >
              <Mic className="h-3.5 w-3.5 shrink-0" />
              Voice note · {att.durationSec ?? 0}s
            </div>
          );
        }
        return (
          <div
            key={att.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
              outbound ? "bg-white/15" : "bg-slate-50",
            )}
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="min-w-0 flex-1 truncate font-medium">{att.name}</span>
            <span className={outbound ? "text-violet-100" : "text-slate-400"}>
              {att.sizeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InboxMessageText({
  text,
  outbound,
  names,
}: {
  text: string;
  outbound: boolean;
  names: string[];
}) {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const pattern =
    sorted.length > 0
      ? new RegExp(
          `(@(?:${sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`,
          "gi",
        )
      : null;
  const parts = pattern ? text.split(pattern) : [text];
  return (
    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={`${part}-${i}`}
            className={cn(
              "rounded px-0.5 font-semibold",
              outbound ? "bg-white/20 text-white" : "bg-violet-50 text-violet-700",
            )}
          >
            {part}
          </span>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        ),
      )}
    </p>
  );
}

function InboxEmojiPicker({
  category,
  onCategory,
  onPick,
}: {
  category: string;
  onCategory: (id: string) => void;
  onPick: (emoji: string) => void;
}) {
  const active =
    EMOJI_CATEGORIES.find((c) => c.id === category) ?? EMOJI_CATEGORIES[0];
  return (
    <div className="absolute bottom-10 left-0 z-40 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1.5">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategory(c.id)}
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold",
              c.id === active.id
                ? "bg-violet-50 text-violet-700"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
        {active.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            title={emoji}
            onClick={() => onPick(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-violet-50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-7 pl-2.5 text-[12px] text-slate-700 outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function IconBtn({
  onClick,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-violet-700"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
