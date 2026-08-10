"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import Link from "next/link";
import {
  Home,
  Hash,
  Send,
  CheckSquare,
  Search,
  Lock,
  MoreHorizontal,
  Paperclip,
  Smile,
  MessageSquare,
  Phone,
  User,
  Archive,
  BellOff,
  Trash2,
  Plus,
  ImageIcon,
  CalendarDays,
  Building2,
  ContactRound,
  Handshake,
  Share2,
  Mic,
  Reply,
  Forward,
  Copy,
  Pencil,
  StickyNote,
  Link2,
  Sparkles,
  Download,
  ExternalLink,
  Pin,
  PinOff,
  ChevronRight,
  X,
  Bell,
} from "lucide-react";
import {
  chatChannels as seedChannels,
  chatContacts,
  chatMessages,
  canEditMessage,
  CURRENT_CHAT_USER,
  type ChatChannel,
  type ChatMessage,
  type ChatPresence,
} from "@/lib/chat/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "👍", "🙏", "🔥", "✅", "🎉", "😂", "❤️"];

type SidebarTab = "chat" | "groups" | "contacts" | "archived";

function isDm(ch: ChatChannel) {
  return !ch.name.trim().startsWith("#");
}

function channelLabel(ch: ChatChannel) {
  return ch.name.replace(/^#\s*/, "");
}

function presenceDotClass(presence?: ChatPresence) {
  if (presence === "online") return "bg-emerald-500";
  if (presence === "away") return "bg-amber-500";
  return "bg-slate-300";
}

function flash(
  setToast: (v: string | null) => void,
  message: string,
  ms = 2600,
) {
  setToast(message);
  window.setTimeout(() => setToast(null), ms);
}

export default function TeamChatPage() {
  const [channels, setChannels] = useState(seedChannels);
  const [activeId, setActiveId] = useState(
    () => seedChannels.find((c) => isDm(c))?.id ?? seedChannels[0].id,
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(chatMessages);
  const [channelQuery, setChannelQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [threadSearch, setThreadSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? channels[0];
  const thread = (messages[activeId] ?? []).filter((m) => {
    if (!threadSearch.trim()) return true;
    return m.body.toLowerCase().includes(threadSearch.toLowerCase());
  });

  const q = channelQuery.trim().toLowerCase();
  const matchesQuery = (ch: ChatChannel) =>
    channelLabel(ch).toLowerCase().includes(q);
  const visible = channels.filter((ch) => !ch.archived && matchesQuery(ch));
  const recentChats = visible
    .filter((c) => isDm(c))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const groupChats = visible
    .filter((c) => !isDm(c))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const archivedChats = channels
    .filter((ch) => ch.archived && matchesQuery(ch))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const filteredContacts = chatContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
  );

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, messages[activeId]?.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (headerMenuRef.current && !headerMenuRef.current.contains(t)) {
        setHeaderMenuOpen(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(t)) {
        setPlusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function updateChannel(id: string, patch: Partial<ChatChannel>) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function send(body?: string, extras?: Partial<ChatMessage>) {
    const text = (body ?? draft).trim();
    if (!text && extras?.kind !== "voice") return;

    if (editingId) {
      setMessages((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).map((m) =>
          m.id === editingId
            ? { ...m, body: text, edited: true, sentAt: "Just now" }
            : m,
        ),
      }));
      setEditingId(null);
      setDraft("");
      setReplyTo(null);
      flash(setToast, "Message updated");
      return;
    }

    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      channelId: activeId,
      author: "You",
      body: text || "Voice note",
      sentAt: "Just now",
      sentAtMs: Date.now(),
      isOwn: true,
      replyToId: replyTo?.id,
      replyToPreview: replyTo
        ? `${replyTo.author}: ${replyTo.body.slice(0, 60)}`
        : undefined,
      ...extras,
    };
    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setDraft("");
    setReplyTo(null);
    setEmojiOpen(false);
  }

  function deleteMessage(id: string) {
    setMessages((prev) => ({
      ...prev,
      [activeId]: (prev[activeId] ?? []).filter((m) => m.id !== id),
    }));
    flash(setToast, "Message deleted");
  }

  function startVoice() {
    if (recording) {
      setRecording(false);
      send("Voice note", { kind: "voice", voiceDurationSec: 8 });
      flash(setToast, "Voice note sent");
      return;
    }
    setRecording(true);
    flash(setToast, "Recording… tap Voice again to send", 4000);
  }

  function onPlusAction(label: string) {
    setPlusMenuOpen(false);
    flash(setToast, label);
  }

  return (
    <div className="relative flex h-[calc(100dvh-0px)] min-h-full flex-col overflow-hidden bg-slate-50">
      <div className="relative flex min-h-0 flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 transition-colors hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Activities</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Team Chat
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Lock className="h-2.5 w-2.5" />
              Internal
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          {/* Left rail — Skote-style chat sidebar */}
          <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 pt-4 pb-3">
              <h2 className="text-[13px] font-bold tracking-[0.08em] text-slate-800 uppercase">
                Chat
              </h2>
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    avatarColor(CURRENT_CHAT_USER.name),
                  )}
                >
                  {initials(CURRENT_CHAT_USER.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {CURRENT_CHAT_USER.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {CURRENT_CHAT_USER.status}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  onClick={() => flash(setToast, "Chat notifications")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 transition-colors focus:border-violet-400 focus:bg-white"
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-0.5 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    ["chat", "Chat"],
                    ["groups", "Groups"],
                    ["contacts", "Contacts"],
                    ["archived", "Archive"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSidebarTab(id)}
                    className={cn(
                      "rounded-md px-1 py-1.5 text-[10px] font-semibold transition-colors sm:text-[11px]",
                      sidebarTab === id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin]">
              {sidebarTab === "chat" ? (
                <>
                  <p className="mb-1.5 px-2 text-[11px] font-medium text-slate-400">
                    Recent
                  </p>
                  <div className="space-y-0.5">
                    {recentChats.map((ch) => (
                      <RecentChatRow
                        key={ch.id}
                        channel={ch}
                        active={activeId === ch.id}
                        onSelect={() => setActiveId(ch.id)}
                        onTogglePin={() =>
                          updateChannel(ch.id, { pinned: !ch.pinned })
                        }
                      />
                    ))}
                    {recentChats.length === 0 ? (
                      <p className="px-2 py-8 text-center text-[11px] text-slate-400">
                        No recent chats
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {sidebarTab === "groups" ? (
                <>
                  <p className="mb-1.5 px-2 text-[11px] font-medium text-slate-400">
                    Groups
                  </p>
                  <div className="space-y-0.5">
                    {groupChats.map((ch) => (
                      <RecentChatRow
                        key={ch.id}
                        channel={ch}
                        active={activeId === ch.id}
                        group
                        onSelect={() => setActiveId(ch.id)}
                        onTogglePin={() =>
                          updateChannel(ch.id, { pinned: !ch.pinned })
                        }
                      />
                    ))}
                    {groupChats.length === 0 ? (
                      <p className="px-2 py-8 text-center text-[11px] text-slate-400">
                        No groups match
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {sidebarTab === "contacts" ? (
                <>
                  <p className="mb-1.5 px-2 text-[11px] font-medium text-slate-400">
                    Contacts
                  </p>
                  <div className="space-y-0.5">
                    {filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (c.channelId) {
                            setActiveId(c.channelId);
                            setSidebarTab("chat");
                          } else {
                            flash(
                              setToast,
                              `Start chat with ${c.name} (coming soon)`,
                            );
                          }
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            presenceDotClass(c.presence),
                          )}
                        />
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            avatarColor(c.name),
                          )}
                        >
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-slate-900">
                            {c.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {c.role}
                          </span>
                        </span>
                      </button>
                    ))}
                    {filteredContacts.length === 0 ? (
                      <p className="px-2 py-8 text-center text-[11px] text-slate-400">
                        No contacts match
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {sidebarTab === "archived" ? (
                <>
                  <p className="mb-1.5 px-2 text-[11px] font-medium text-slate-400">
                    Archived
                  </p>
                  <div className="space-y-0.5">
                    {archivedChats.map((ch) => (
                      <RecentChatRow
                        key={ch.id}
                        channel={ch}
                        active={activeId === ch.id}
                        group={!isDm(ch)}
                        archived
                        onSelect={() => setActiveId(ch.id)}
                        onTogglePin={() =>
                          updateChannel(ch.id, { pinned: !ch.pinned })
                        }
                        onUnarchive={() => {
                          updateChannel(ch.id, { archived: false });
                          setActiveId(ch.id);
                          setSidebarTab(isDm(ch) ? "chat" : "groups");
                          flash(setToast, "Chat restored");
                        }}
                      />
                    ))}
                    {archivedChats.length === 0 ? (
                      <p className="px-2 py-8 text-center text-[11px] text-slate-400">
                        No archived chats
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </aside>

          {/* Conversation */}
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isDm(active) ? (
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold",
                        avatarColor(channelLabel(active)),
                      )}
                    >
                      {initials(channelLabel(active))}
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Hash className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-slate-900">
                      {isDm(active)
                        ? channelLabel(active)
                        : `# ${channelLabel(active)}`}
                      {active.muted ? (
                        <BellOff className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : null}
                      {active.pinned ? (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      ) : null}
                    </h2>
                    <p className="truncate text-[11px] text-slate-500">
                      {active.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className="relative mr-1 hidden sm:block">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-8 w-36 rounded-lg border border-slate-200 bg-slate-50 pr-2 pl-8 text-[12px] outline-none focus:border-violet-400 focus:bg-white"
                  />
                </div>

                <button
                  type="button"
                  aria-label="Audio call"
                  title="Audio call"
                  onClick={() =>
                    flash(
                      setToast,
                      `Starting audio call with ${channelLabel(active)}…`,
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
                >
                  <Phone className="h-4 w-4" />
                </button>

                <div className="relative" ref={headerMenuRef}>
                  <button
                    type="button"
                    aria-label="More"
                    aria-expanded={headerMenuOpen}
                    onClick={() => setHeaderMenuOpen((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {headerMenuOpen ? (
                    <div className="absolute top-9 right-0 z-40 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      <MenuItem
                        icon={User}
                        label="Profile"
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          flash(setToast, "Open profile");
                        }}
                      />
                      <MenuItem
                        icon={Archive}
                        label={active.archived ? "Unarchive" : "Archive"}
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          const id = active.id;
                          if (active.archived) {
                            updateChannel(id, { archived: false });
                            setSidebarTab(isDm(active) ? "chat" : "groups");
                            flash(setToast, "Chat restored");
                            return;
                          }
                          setChannels((prev) => {
                            const nextList = prev.map((c) =>
                              c.id === id ? { ...c, archived: true } : c,
                            );
                            const next = nextList.find(
                              (c) => c.id !== id && !c.archived,
                            );
                            if (next) setActiveId(next.id);
                            return nextList;
                          });
                          setSidebarTab("archived");
                          flash(setToast, "Chat archived — view in Archive tab");
                        }}
                      />
                      <MenuItem
                        icon={BellOff}
                        label={active.muted ? "Unmute" : "Muted"}
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          updateChannel(active.id, { muted: !active.muted });
                          flash(
                            setToast,
                            active.muted ? "Chat unmuted" : "Chat muted",
                          );
                        }}
                      />
                      <MenuItem
                        icon={Trash2}
                        label="Delete"
                        danger
                        onClick={() => {
                          setHeaderMenuOpen(false);
                          const id = active.id;
                          setChannels((prev) => {
                            const nextList = prev.filter((c) => c.id !== id);
                            const next = nextList[0];
                            if (next) setActiveId(next.id);
                            return nextList;
                          });
                          flash(setToast, "Chat deleted");
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </header>

            <div
              ref={feedRef}
              className="relative flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin]"
            >
              <div className="mx-auto mb-6 flex max-w-2xl flex-col items-center text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <p className="text-[13px] font-semibold text-slate-800">
                  {isDm(active)
                    ? `Conversation with ${channelLabel(active)}`
                    : `Welcome to #${channelLabel(active)}`}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Hover a message for actions · Edit within 20 minutes
                </p>
              </div>

              <div className="mx-auto max-w-3xl space-y-1">
                {thread.map((msg, i) => {
                  const prev = thread[i - 1];
                  const showMeta =
                    !prev ||
                    prev.author !== msg.author ||
                    prev.isOwn !== msg.isOwn;

                  if (msg.author === "System" || msg.kind === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center py-3">
                        <div className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                          {msg.body}
                          <span className="ml-2 text-slate-400">
                            {msg.sentAt}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      showMeta={showMeta}
                      onAction={(action) => {
                        if (action === "reply") {
                          setReplyTo(msg);
                          setEditingId(null);
                          return;
                        }
                        if (action === "forward") {
                          flash(setToast, "Forward message…");
                          return;
                        }
                        if (action === "copy") {
                          void navigator.clipboard?.writeText(msg.body);
                          flash(setToast, "Copied");
                          return;
                        }
                        if (action === "edit") {
                          if (!canEditMessage(msg)) {
                            flash(
                              setToast,
                              "Edit window expired (20 minutes)",
                            );
                            return;
                          }
                          setEditingId(msg.id);
                          setDraft(msg.body);
                          setReplyTo(null);
                          return;
                        }
                        if (action === "delete") {
                          deleteMessage(msg.id);
                          return;
                        }
                        if (action === "note") {
                          flash(setToast, "Added as note");
                          return;
                        }
                        if (action === "task") {
                          flash(
                            setToast,
                            `Task created from “${msg.body.slice(0, 40)}${msg.body.length > 40 ? "…" : ""}”`,
                          );
                          return;
                        }
                        if (action === "meeting") {
                          flash(setToast, "Schedule meeting link…");
                          return;
                        }
                        if (action === "link") {
                          flash(setToast, "Link to record…");
                          return;
                        }
                        if (action === "ai") {
                          flash(setToast, "Ask AI…");
                          return;
                        }
                        if (action === "download") {
                          flash(setToast, "Downloading attachment…");
                          return;
                        }
                        if (action === "open") {
                          flash(setToast, "Opening attachment…");
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
              <div className="mx-auto max-w-3xl">
                {replyTo || editingId ? (
                  <div className="mb-2 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-[12px] text-violet-800">
                    <span className="truncate">
                      {editingId
                        ? "Editing message"
                        : `Replying to ${replyTo?.author}: ${replyTo?.body.slice(0, 48)}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => {
                        setReplyTo(null);
                        setEditingId(null);
                        setDraft("");
                      }}
                      className="ml-2 rounded p-0.5 hover:bg-violet-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all focus-within:border-violet-400 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_4px_16px_rgba(15,23,42,0.06)]">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder={
                      recording
                        ? "Recording voice note…"
                        : `Message ${isDm(active) ? channelLabel(active) : `#${channelLabel(active)}`}…`
                    }
                    className="max-h-32 min-h-[52px] w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5">
                    <div className="relative flex items-center gap-0.5" ref={plusMenuRef}>
                      <button
                        type="button"
                        aria-label="Add"
                        title="Add"
                        onClick={() => setPlusMenuOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {plusMenuOpen ? (
                        <div className="absolute bottom-10 left-0 z-40 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          <MenuItem
                            icon={ImageIcon}
                            label="Image"
                            onClick={() => onPlusAction("Attach image…")}
                          />
                          <MenuItem
                            icon={Paperclip}
                            label="Attachment"
                            onClick={() => onPlusAction("Attach file…")}
                          />
                          <MenuItem
                            icon={CalendarDays}
                            label="Meeting"
                            onClick={() => onPlusAction("Schedule meeting…")}
                          />
                          <MenuItem
                            icon={CheckSquare}
                            label="Task"
                            onClick={() => onPlusAction("Create task…")}
                          />
                          <div className="my-1 border-t border-slate-100" />
                          <p className="px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                            Create
                          </p>
                          <MenuItem
                            icon={ContactRound}
                            label="Lead"
                            onClick={() => onPlusAction("Create lead…")}
                          />
                          <MenuItem
                            icon={User}
                            label="Contact"
                            onClick={() => onPlusAction("Create contact…")}
                          />
                          <MenuItem
                            icon={Handshake}
                            label="Deal"
                            onClick={() => onPlusAction("Create deal…")}
                          />
                          <MenuItem
                            icon={Building2}
                            label="Org"
                            onClick={() => onPlusAction("Create organization…")}
                          />
                          <div className="my-1 border-t border-slate-100" />
                          <p className="px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                            Share record
                          </p>
                          <MenuItem
                            icon={Share2}
                            label="Lead"
                            onClick={() => onPlusAction("Share lead…")}
                          />
                          <MenuItem
                            icon={Share2}
                            label="Contact"
                            onClick={() => onPlusAction("Share contact…")}
                          />
                          <MenuItem
                            icon={Share2}
                            label="Deal"
                            onClick={() => onPlusAction("Share deal…")}
                          />
                          <MenuItem
                            icon={Share2}
                            label="Org"
                            onClick={() => onPlusAction("Share organization…")}
                          />
                        </div>
                      ) : null}

                      <div className="relative">
                        <ComposerIcon
                          icon={Smile}
                          label="Emoji"
                          onClick={() => setEmojiOpen((v) => !v)}
                        />
                        {emojiOpen ? (
                          <div className="absolute bottom-10 left-0 z-40 flex gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            {EMOJIS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-slate-50"
                                onClick={() => {
                                  setDraft((d) => d + e);
                                  setEmojiOpen(false);
                                }}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Voice"
                        title={recording ? "Stop & send voice note" : "Voice note"}
                        onClick={startVoice}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                          recording
                            ? "bg-rose-100 text-rose-600"
                            : "text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => send()}
                        disabled={!draft.trim() && !editingId}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-violet-600/25 transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        {editingId ? "Save" : "Send"}
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  Shift+Enter for new line · Voice notes · Pin chats from the list
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[12px] font-medium text-emerald-800 shadow-lg">
          <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      {label}
    </button>
  );
}

function RecentChatRow({
  channel,
  active,
  onSelect,
  onTogglePin,
  onUnarchive,
  group,
  archived,
}: {
  channel: ChatChannel;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onUnarchive?: () => void;
  group?: boolean;
  archived?: boolean;
}) {
  const label = channelLabel(channel);
  return (
    <div
      className={cn(
        "group relative flex w-full items-stretch rounded-xl transition-colors",
        active ? "bg-violet-50" : "hover:bg-slate-50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left"
      >
        {!group ? (
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              presenceDotClass(channel.presence),
            )}
          />
        ) : (
          <span className="w-2 shrink-0" />
        )}

        {group ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px]",
              active
                ? "bg-violet-100 text-violet-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Hash className="h-4 w-4" />
          </span>
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
              avatarColor(label),
            )}
          >
            {initials(label)}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "truncate text-[13px] font-semibold",
                active ? "text-violet-900" : "text-slate-900",
              )}
            >
              {group ? `# ${label}` : label}
            </span>
            {channel.pinned ? (
              <Pin className="h-3 w-3 shrink-0 text-violet-500" />
            ) : null}
            {channel.muted ? (
              <BellOff className="h-3 w-3 shrink-0 text-slate-400" />
            ) : null}
            {archived ? (
              <Archive className="h-3 w-3 shrink-0 text-slate-400" />
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-400">
            {channel.lastMessagePreview || channel.description}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
          <span className="text-[10px] whitespace-nowrap text-slate-400">
            {channel.lastMessageAt || ""}
          </span>
          {!archived && channel.unread > 0 ? (
            <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
              {channel.unread}
            </span>
          ) : null}
        </span>
      </button>

      {archived && onUnarchive ? (
        <button
          type="button"
          aria-label="Unarchive chat"
          title="Unarchive"
          onClick={(e) => {
            e.stopPropagation();
            onUnarchive();
          }}
          className="mr-1 flex h-8 shrink-0 items-center gap-1 self-center rounded-lg px-2 text-[10px] font-semibold text-violet-700 opacity-100 transition-colors hover:bg-violet-100"
        >
          <Archive className="h-3.5 w-3.5" />
          Restore
        </button>
      ) : (
        <button
          type="button"
          aria-label={channel.pinned ? "Unpin chat" : "Pin chat"}
          title={channel.pinned ? "Unpin" : "Pin"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={cn(
            "mr-1 flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white hover:text-violet-600",
            channel.pinned && "opacity-100",
          )}
        >
          {channel.pinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

type MsgAction =
  | "reply"
  | "forward"
  | "copy"
  | "edit"
  | "delete"
  | "note"
  | "task"
  | "meeting"
  | "link"
  | "ai"
  | "download"
  | "open";

function MessageBubble({
  msg,
  showMeta,
  onAction,
}: {
  msg: ChatMessage;
  showMeta: boolean;
  onAction: (action: MsgAction) => void;
}) {
  const own = !!msg.isOwn;
  const editable = canEditMessage(msg);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      className={cn(
        "group flex gap-2.5 py-1",
        own ? "flex-row-reverse" : "flex-row",
      )}
    >
      {showMeta ? (
        <span
          className={cn(
            "mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            own ? "bg-violet-100 text-violet-700" : avatarColor(msg.author),
          )}
        >
          {initials(msg.author === "You" ? "Roshna Abraham" : msg.author)}
        </span>
      ) : (
        <span className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          "relative flex max-w-[min(100%,420px)] flex-col",
          own ? "items-end" : "items-start",
        )}
      >
        {showMeta ? (
          <div
            className={cn(
              "mb-1 flex items-center gap-2 px-0.5 text-[11px]",
              own ? "flex-row-reverse" : "flex-row",
            )}
          >
            <span className="font-semibold text-slate-700">
              {msg.author === "You" ? "You" : msg.author}
            </span>
            <span className="text-slate-400">
              {msg.sentAt}
              {msg.edited ? " · edited" : ""}
            </span>
          </div>
        ) : null}

        {msg.replyToPreview ? (
          <div
            className={cn(
              "mb-1 max-w-full truncate rounded-lg border px-2 py-1 text-[11px]",
              own
                ? "border-violet-400/40 bg-violet-500/30 text-violet-50"
                : "border-slate-200 bg-slate-50 text-slate-500",
            )}
          >
            {msg.replyToPreview}
          </div>
        ) : null}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setMoreOpen(false);
            }}
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed shadow-sm transition-shadow",
              own
                ? "rounded-tr-md bg-violet-600 text-white shadow-violet-600/20"
                : "rounded-tl-md border border-slate-100 bg-white text-slate-800",
              menuOpen && "ring-2 ring-violet-300",
            )}
          >
            {msg.kind === "voice" ? (
              <span className="inline-flex items-center gap-2">
                <Mic className="h-3.5 w-3.5" />
                Voice note · {msg.voiceDurationSec ?? 0}s
              </span>
            ) : (
              msg.body
            )}

            {msg.attachments?.length ? (
              <div className="mt-2 space-y-1.5">
                {msg.attachments.map((att) => (
                  <div
                    key={att.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                      own ? "bg-white/15" : "bg-slate-50",
                    )}
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{att.name}</p>
                      <p className={own ? "text-violet-100" : "text-slate-400"}>
                        {att.sizeLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Download"
                      title="Download"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("download");
                      }}
                      className="rounded p-1 hover:bg-black/10"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Open"
                      title="Open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("open");
                      }}
                      className="rounded p-1 hover:bg-black/10"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </button>

          {menuOpen ? (
            <div
              className={cn(
                "absolute z-40 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
                own ? "right-0" : "left-0",
              )}
            >
              <MenuItem
                icon={Reply}
                label="Reply"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("reply");
                }}
              />
              <MenuItem
                icon={Forward}
                label="Forward"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("forward");
                }}
              />
              <MenuItem
                icon={Copy}
                label="Copy"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("copy");
                }}
              />
              {own ? (
                <MenuItem
                  icon={Pencil}
                  label={editable ? "Edit" : "Edit (expired)"}
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("edit");
                  }}
                />
              ) : null}
              <MenuItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  onAction("delete");
                }}
              />
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <MoreHorizontal className="h-3.5 w-3.5 opacity-70" />
                  More…
                </span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 text-slate-400 transition-transform",
                    moreOpen && "rotate-90",
                  )}
                />
              </button>
              {moreOpen ? (
                <div className="border-t border-slate-100 bg-slate-50/80 py-1">
                  <MenuItem
                    icon={StickyNote}
                    label="Add as Note"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("note");
                    }}
                  />
                  <MenuItem
                    icon={CheckSquare}
                    label="Create a Task"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("task");
                    }}
                  />
                  <MenuItem
                    icon={CalendarDays}
                    label="Schedule Meeting Link"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("meeting");
                    }}
                  />
                  <MenuItem
                    icon={Link2}
                    label="Link to Record"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("link");
                    }}
                  />
                  <MenuItem
                    icon={Sparkles}
                    label="Ask AI"
                    onClick={() => {
                      setMenuOpen(false);
                      onAction("ai");
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ComposerIcon({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-violet-600"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
