"use client";

import { useEffect, useRef, useState } from "react";
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
  AtSign,
  MessageSquare,
} from "lucide-react";
import {
  chatChannels,
  chatMessages,
  type ChatChannel,
  type ChatMessage,
} from "@/lib/chat/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

function isDm(ch: ChatChannel) {
  return !ch.name.trim().startsWith("#");
}

function channelLabel(ch: ChatChannel) {
  return ch.name.replace(/^#\s*/, "");
}

export default function TeamChatPage() {
  const [activeId, setActiveId] = useState(chatChannels[0].id);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(chatMessages);
  const [channelQuery, setChannelQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const active = chatChannels.find((c) => c.id === activeId)!;
  const thread = messages[activeId] ?? [];

  const filteredChannels = chatChannels.filter((ch) =>
    channelLabel(ch).toLowerCase().includes(channelQuery.toLowerCase()),
  );

  const channels = filteredChannels.filter((c) => !isDm(c));
  const dms = filteredChannels.filter((c) => isDm(c));

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeId, thread.length]);

  function send() {
    if (!draft.trim()) return;
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      channelId: activeId,
      author: "You",
      body: draft.trim(),
      sentAt: "Just now",
      isOwn: true,
    };
    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setDraft("");
  }

  function createTaskFrom(msg: ChatMessage) {
    setToast(`Task created from “${msg.body.slice(0, 48)}${msg.body.length > 48 ? "…" : ""}”`);
    window.setTimeout(() => setToast(null), 2800);
  }

  return (
    <div className="relative flex h-[calc(100dvh-0px)] min-h-full flex-col overflow-hidden bg-slate-50">
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
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              · Never mixes with client channels
            </span>
          </div>
        </div>

        {/* One continuous workspace surface */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
          {/* Channel rail */}
          <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-100 bg-gradient-to-b from-slate-50/90 to-white">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  placeholder="Find a channel…"
                  className="h-9 w-full rounded-xl border border-slate-200/90 bg-white pr-3 pl-9 text-[12px] text-slate-800 shadow-sm outline-none placeholder:text-slate-400 transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:thin]">
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Channels
              </p>
              <div className="space-y-0.5">
                {channels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    active={activeId === ch.id}
                    onSelect={() => setActiveId(ch.id)}
                  />
                ))}
              </div>

              <p className="mt-4 mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Direct messages
              </p>
              <div className="space-y-0.5">
                {dms.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    active={activeId === ch.id}
                    onSelect={() => setActiveId(ch.id)}
                    dm
                  />
                ))}
              </div>

              {filteredChannels.length === 0 ? (
                <p className="px-2.5 py-8 text-center text-[11px] text-slate-400">
                  No channels match
                </p>
              ) : null}
            </div>
          </aside>

          {/* Conversation */}
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
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
                    <h2 className="truncate text-[15px] font-semibold text-slate-900">
                      {isDm(active) ? channelLabel(active) : `# ${channelLabel(active)}`}
                    </h2>
                    <p className="truncate text-[11px] text-slate-500">
                      {active.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
                <button
                  type="button"
                  aria-label="More"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
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
                  Hover a message to create a task · Enter to send
                </p>
              </div>

              <div className="mx-auto max-w-3xl space-y-1">
                {thread.map((msg, i) => {
                  const prev = thread[i - 1];
                  const showMeta =
                    !prev ||
                    prev.author !== msg.author ||
                    prev.isOwn !== msg.isOwn;

                  if (msg.author === "System") {
                    return (
                      <div
                        key={msg.id}
                        className="flex justify-center py-3"
                      >
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
                      onCreateTask={() => createTaskFrom(msg)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Elevated composer */}
            <div className="border-t border-slate-100 bg-gradient-to-t from-slate-50/80 to-white px-4 py-3 sm:px-5">
              <div className="mx-auto max-w-3xl">
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
                    placeholder={`Message ${isDm(active) ? channelLabel(active) : `#${channelLabel(active)}`}…`}
                    className="max-h-32 min-h-[52px] w-full resize-none bg-transparent px-3 py-2 text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5">
                    <div className="flex items-center gap-0.5">
                      <ComposerIcon icon={Paperclip} label="Attach" />
                      <ComposerIcon icon={AtSign} label="Mention" />
                      <ComposerIcon icon={Smile} label="Emoji" />
                    </div>
                    <button
                      type="button"
                      onClick={send}
                      disabled={!draft.trim()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-violet-600/25 transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      Send
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  Shift+Enter for new line · Create tasks from any message
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

function ChannelRow({
  channel,
  active,
  onSelect,
  dm,
}: {
  channel: ChatChannel;
  active: boolean;
  onSelect: () => void;
  dm?: boolean;
}) {
  const label = channelLabel(channel);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all",
        active
          ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
          : "text-slate-600 hover:bg-white hover:shadow-sm",
      )}
    >
      {dm ? (
        <span
          className={cn(
            "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            active ? "bg-white/20 text-white" : avatarColor(label),
          )}
        >
          {initials(label)}
          <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-400" />
        </span>
      ) : (
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px]",
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          <Hash className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
        {label}
      </span>
      {channel.unread > 0 ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
            active ? "bg-white text-violet-700" : "bg-violet-600 text-white",
          )}
        >
          {channel.unread}
        </span>
      ) : null}
    </button>
  );
}

function MessageBubble({
  msg,
  showMeta,
  onCreateTask,
}: {
  msg: ChatMessage;
  showMeta: boolean;
  onCreateTask: () => void;
}) {
  const own = !!msg.isOwn;
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
          "flex max-w-[min(100%,420px)] flex-col",
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
            <span className="text-slate-400">{msg.sentAt}</span>
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
            own
              ? "rounded-tr-md bg-violet-600 text-white shadow-violet-600/20"
              : "rounded-tl-md border border-slate-100 bg-white text-slate-800",
          )}
        >
          {msg.body}
        </div>

        <button
          type="button"
          onClick={onCreateTask}
          className="mt-1 flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-violet-50"
        >
          <CheckSquare className="h-3 w-3" />
          Create task
        </button>
      </div>
    </div>
  );
}

function ComposerIcon({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-violet-600"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
