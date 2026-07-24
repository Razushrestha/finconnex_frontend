"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Home,
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
  type InboxStatus,
} from "@/lib/marketing/inbox/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const CHANNEL_DOT: Record<InboxChannel, string> = {
  "Facebook Messenger": "bg-blue-500",
  "Instagram DM": "bg-pink-500",
  WhatsApp: "bg-emerald-500",
  SMS: "bg-sky-500",
  Email: "bg-violet-500",
  "Web Chat": "bg-slate-500",
};

const CHANNEL_SOFT: Record<InboxChannel, string> = {
  "Facebook Messenger": "bg-blue-50 text-blue-700",
  "Instagram DM": "bg-pink-50 text-pink-700",
  WhatsApp: "bg-emerald-50 text-emerald-700",
  SMS: "bg-sky-50 text-sky-700",
  Email: "bg-violet-50 text-violet-700",
  "Web Chat": "bg-slate-100 text-slate-600",
};

const STATUS_STYLE: Record<InboxStatus, string> = {
  Open: "bg-sky-50 text-sky-700",
  Pending: "bg-amber-50 text-amber-800",
  Resolved: "bg-emerald-50 text-emerald-700",
};

export function UnifiedInboxClient() {
  const [rows, setRows] = useState<InboxConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<InboxChannel | "All">(
    "All",
  );
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "All">("All");
  const [agentFilter, setAgentFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

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
    if (statusFilter !== "All")
      data = data.filter((c) => c.status === statusFilter);
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
    if (!active || !draft.trim()) return;
    const msg: InboxMessage = {
      id: `m-${Date.now()}`,
      body: draft.trim(),
      at: formatInboxAt(),
      outbound: true,
      author: active.assignedAgent === "Unassigned" ? "You" : active.assignedAgent,
    };
    persist({
      ...active,
      messages: [...active.messages, msg],
      lastMessage: msg.body,
      timestamp: msg.at,
      unreadCount: 0,
    });
    setDraft("");
    flash(`Reply sent via ${active.channel}`);
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
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
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
              <span className="text-slate-500">Marketing</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Unified Inbox
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Inbox className="h-2.5 w-2.5" />
              §10.4
            </span>
            {unreadTotal > 0 ? (
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadTotal} unread
              </span>
            ) : null}
          </div>
          <Link
            href="/marketing/inbox/settings"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5" />
            Channels
          </Link>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Channel rail */}
          <aside className="hidden w-[180px] shrink-0 flex-col border-r border-slate-100 bg-gradient-to-b from-slate-50/90 to-white lg:flex">
            <div className="border-b border-slate-100 px-3 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Channels
              </p>
            </div>
            <div className="flex-1 space-y-0.5 overflow-auto p-2">
              <ChannelBtn
                active={channelFilter === "All"}
                onClick={() => setChannelFilter("All")}
                label="All channels"
                count={rows.filter((c) => !c.archived).length}
              />
              {INBOX_CHANNELS.map((ch) => (
                <ChannelBtn
                  key={ch}
                  active={channelFilter === ch}
                  onClick={() => setChannelFilter(ch)}
                  label={ch}
                  count={channelCounts[ch]}
                  dot={CHANNEL_DOT[ch]}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "m-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold",
                showArchived
                  ? "bg-slate-200 text-slate-800"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          </aside>

          {/* Conversation list */}
          <div className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-slate-100 sm:max-w-[340px]">
            <div className="space-y-2 border-b border-slate-100 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="h-8 w-full rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {INBOX_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setStatusFilter(statusFilter === s ? "All" : s)
                    }
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                      statusFilter === s
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-400 hover:bg-slate-50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none"
              >
                <option value="All">All agents</option>
                {INBOX_AGENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
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
                      <p className="truncate text-[12px] font-semibold text-slate-900">
                        {c.contactName}
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
                      onChange={(e) =>
                        setStatus(e.target.value as InboxStatus)
                      }
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
                        "flex gap-2",
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
                          "max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm",
                          m.outbound
                            ? "rounded-br-md bg-violet-600 text-white"
                            : "rounded-bl-md border border-slate-100 bg-white text-slate-800",
                        )}
                      >
                        <p className="text-[13px] leading-relaxed">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[9px]",
                            m.outbound ? "text-violet-200" : "text-slate-400",
                          )}
                        >
                          {m.at} · {m.author}
                          {m.outbound ? ` · via ${active.channel}` : ""}
                        </p>
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
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder={`Reply on ${active.channel}…`}
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] outline-none focus:border-violet-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                    />
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={!draft.trim()}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
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
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Conversation-level notes…"
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
                    <span className="font-semibold text-slate-400">Related:</span>{" "}
                    {active.relatedTo ?? "Not linked"}
                  </p>
                </div>
              </div>
            </aside>
          ) : null}
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

function ChannelBtn({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors",
        active
          ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/80"
          : "text-slate-600 hover:bg-white/70",
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="tabular-nums text-[10px] text-slate-400">{count}</span>
    </button>
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
