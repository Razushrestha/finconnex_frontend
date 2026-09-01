"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellPlus,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  History,
  Phone,
  Plus,
  Sparkles,
  StickyNote,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { menuEnter } from "@/lib/motion";
import { BOTTOM_BAR_H } from "@/lib/layout";
import { getModuleTitle } from "@/lib/module-title";
import { reminders } from "@/lib/reminders/types";
import { StickyNotePad } from "@/components/layout/StickyNotePad";
import { SoftphonePad } from "@/components/layout/SoftphonePad";
import { VoiceAssistant } from "@/components/layout/VoiceAssistant";
import { subscribeSoftphoneOpen } from "@/lib/softphone/events";
import { listStickyNotes, notePreview } from "@/lib/sticky-notes/store";
import type { VoiceAction } from "@/lib/voice/commands";

type Panel = "ai" | "reminders" | "recent" | "quick" | null;

const QUICK_ADD_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "New Lead", href: "/sales/leads/create", icon: UserPlus },
  { label: "New Contact", href: "/sales/contacts/create", icon: Users },
  { label: "New Deal", href: "/sales/deals/create", icon: Briefcase },
  { label: "New Task", href: "/activities/tasks/create", icon: ClipboardList },
  { label: "New Appointment", href: "/activities/meetings/create", icon: Calendar },
  {
    label: "Document Request",
    href: "/documents/requests/create?layoutid=standard&redirect=false",
    icon: FileText,
  },
];

const ADD_REMINDER = {
  label: "Add reminder",
  href: "/activities/reminders/create",
  icon: BellPlus,
};

const RECENT_KEY = "finconnex.recent-items.v1";
const DISMISSED_REMINDERS_KEY = "finconnex.dismissed-reminders.v1";

interface RecentItem {
  href: string;
  title: string;
  at: number;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function pushRecent(href: string, title: string) {
  const path = href.split("?")[0] || "/";
  const next: RecentItem[] = [
    { href: path, title, at: Date.now() },
    ...readJson<RecentItem[]>(RECENT_KEY, []).filter((item) => item.href !== path),
  ].slice(0, 12);
  writeJson(RECENT_KEY, next);
  return next;
}

export function BottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [panel, setPanel] = React.useState<Panel>(null);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [phoneOpen, setPhoneOpen] = React.useState(false);
  const [phoneAnchor, setPhoneAnchor] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [phonePlacement, setPhonePlacement] = React.useState(0);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [noteCount, setNoteCount] = React.useState(0);
  const [recent, setRecent] = React.useState<RecentItem[]>([]);
  const [aiInput, setAiInput] = React.useState("");
  const [aiMessages, setAiMessages] = React.useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: "Hi — I can help you find records, draft follow-ups, or jump to a module. What do you need?",
    },
  ]);
  const [dismissedReminderIds, setDismissedReminderIds] = React.useState<
    string[]
  >([]);
  const barRef = React.useRef<HTMLElement>(null);

  const pendingReminders = React.useMemo(
    () =>
      reminders.filter(
        (r) =>
          (r.status === "Pending" || r.status === "Snoozed") &&
          !dismissedReminderIds.includes(r.id),
      ),
    [dismissedReminderIds],
  );

  React.useEffect(() => {
    setDismissedReminderIds(readJson<string[]>(DISMISSED_REMINDERS_KEY, []));
    setNoteCount(listStickyNotes().filter((n) => notePreview(n.html)).length);
  }, []);

  React.useEffect(() => {
    setRecent(pushRecent(pathname, getModuleTitle(pathname)));
  }, [pathname]);

  React.useEffect(() => {
    setPanel(null);
  }, [pathname]);

  React.useEffect(() => {
    return subscribeSoftphoneOpen((detail) => {
      setPanel(null);
      setNotesOpen(false);
      setVoiceOpen(false);
      setPhoneAnchor(
        detail.x != null && detail.y != null
          ? { x: detail.x, y: detail.y }
          : null,
      );
      setPhoneNumber(detail.phone?.trim() ?? "");
      setPhonePlacement((key) => key + 1);
      setPhoneOpen(true);
    });
  }, []);

  React.useEffect(() => {
    if (panel === "recent") setRecent(readJson<RecentItem[]>(RECENT_KEY, []));
  }, [panel]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanel(null);
        setVoiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(next: Panel) {
    setNotesOpen(false);
    setPhoneOpen(false);
    setVoiceOpen(false);
    setPanel((cur) => (cur === next ? null : next));
  }

  function toggleNotes() {
    setPanel(null);
    setPhoneOpen(false);
    setVoiceOpen(false);
    setNotesOpen((v) => !v);
  }

  function togglePhone() {
    setPanel(null);
    setNotesOpen(false);
    setVoiceOpen(false);
    if (phoneOpen) {
      setPhoneOpen(false);
      return;
    }
    setPhoneAnchor(null);
    setPhoneNumber("");
    setPhonePlacement((key) => key + 1);
    setPhoneOpen(true);
  }

  function runVoiceAction(action: VoiceAction) {
    if (action.type === "navigate") {
      setVoiceOpen(false);
      go(action.href);
      return;
    }
    if (action.type === "softphone") {
      setVoiceOpen(false);
      setPanel(null);
      setNotesOpen(false);
      setPhoneOpen(true);
      return;
    }
    if (action.type === "notes") {
      setVoiceOpen(false);
      setPanel(null);
      setPhoneOpen(false);
      setNotesOpen(true);
      return;
    }
    if (action.type === "reminders") {
      setVoiceOpen(false);
      setNotesOpen(false);
      setPhoneOpen(false);
      setPanel("reminders");
      return;
    }
    if (action.type === "quick-add") {
      setVoiceOpen(false);
      setNotesOpen(false);
      setPhoneOpen(false);
      setPanel("quick-add");
      return;
    }
  }

  function go(href: string) {
    setPanel(null);
    router.push(href);
  }

  function sendAi() {
    const text = aiInput.trim();
    if (!text) return;
    setAiInput("");
    setAiMessages((prev) => [
      ...prev,
      { role: "user", text },
      {
        role: "assistant",
        text: "I can take you to Leads, Deals, Tasks, or Reminders from Quick Add. Tell me the record type and I’ll point you to the right screen.",
      },
    ]);
  }

  function dismissReminder(id: string) {
    setDismissedReminderIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      writeJson(DISMISSED_REMINDERS_KEY, next);
      return next;
    });
  }

  function dismissAllReminders() {
    const ids = pendingReminders.map((r) => r.id);
    if (!ids.length) return;
    setDismissedReminderIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      writeJson(DISMISSED_REMINDERS_KEY, next);
      return next;
    });
  }

  return (
    <footer
      ref={barRef}
      className={cn(
        "relative fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        BOTTOM_BAR_H,
      )}
    >
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto px-1 sm:px-2">
        <ToolButton
          label="AI Assistant"
          icon={Sparkles}
          active={panel === "ai"}
          onClick={() => toggle("ai")}
        />
        <ToolButton
          label="Softphone"
          icon={Phone}
          active={phoneOpen}
          onClick={togglePhone}
        />
        <ToolButton
          label="Reminders"
          icon={Bell}
          badge={pendingReminders.length}
          active={panel === "reminders"}
          onClick={() => toggle("reminders")}
        />
        <ToolButton
          label="Sticky Notes"
          icon={StickyNote}
          badge={noteCount}
          active={notesOpen}
          onClick={toggleNotes}
        />
        <ToolButton
          label="Recent Items"
          icon={History}
          active={panel === "recent"}
          onClick={() => toggle("recent")}
        />
      </div>

      <div className="relative flex shrink-0 items-center gap-2 pr-2 sm:pr-3">
        <VoiceAssistant
          open={voiceOpen}
          onOpen={() => {
            setPanel(null);
            setNotesOpen(false);
            setPhoneOpen(false);
            setVoiceOpen(true);
          }}
          onClose={() => setVoiceOpen(false)}
          onAction={runVoiceAction}
        />
        <button
          type="button"
          aria-expanded={panel === "quick"}
          aria-haspopup="menu"
          onClick={() => toggle("quick")}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-[#5A32A3] px-2.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#4c2a8a]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Quick Add
        </button>

        {panel === "quick" ? (
          <PanelCard className="right-2 w-[240px] p-1.5" title={null}>
            <p className="px-2 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Create
            </p>
            {QUICK_ADD_ITEMS.map((item) => (
              <QuickAddRow
                key={item.href}
                item={item}
                onSelect={() => go(item.href)}
              />
            ))}
            <div className="my-1 h-px bg-border" />
            <QuickAddRow
              item={ADD_REMINDER}
              onSelect={() => go(ADD_REMINDER.href)}
            />
          </PanelCard>
        ) : null}
      </div>

      {panel === "ai" ? (
        <PanelCard className="left-2 w-[360px] max-w-[calc(100vw-1rem)]" title="AI Assistant">
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-2">
            {aiMessages.map((m, i) => (
              <p
                key={`${m.role}-${i}`}
                className={cn(
                  "max-w-[90%] rounded-xl px-2.5 py-1.5 text-[12px] leading-5",
                  m.role === "assistant"
                    ? "bg-violet-50 text-foreground dark:bg-violet-950/40"
                    : "ml-auto bg-slate-100 text-foreground dark:bg-zinc-800",
                )}
              >
                {m.text}
              </p>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendAi();
            }}
          >
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask FinConnex…"
              className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="submit"
              className="h-8 rounded-lg bg-[#5A32A3] px-2.5 text-[11px] font-semibold text-white"
            >
              Send
            </button>
          </form>
        </PanelCard>
      ) : null}

      {panel === "reminders" ? (
        <PanelCard className="left-2 w-[340px] max-w-[calc(100vw-1rem)]" title={null}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-[12px] font-semibold text-foreground">Reminders</p>
            <button
              type="button"
              disabled={pendingReminders.length === 0}
              onClick={dismissAllReminders}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-40"
            >
              Dismiss all
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {pendingReminders.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-1 border-b border-border/70 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => go(`/activities/reminders/detail/${r.id}`)}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/70"
                >
                  <span className="truncate text-[12px] font-semibold text-foreground">
                    {r.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.dateTime}
                    {r.relatedTo ? ` · ${r.relatedTo}` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Dismiss ${r.title}`}
                  title="Dismiss"
                  onClick={() => dismissReminder(r.id)}
                  className="mt-1.5 mr-1.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {pendingReminders.length === 0 ? (
              <li className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                No upcoming reminders
              </li>
            ) : null}
          </ul>
          <div className="flex gap-2 border-t border-border p-2">
            <Link
              href="/activities/reminders"
              onClick={() => setPanel(null)}
              className="flex h-8 flex-1 items-center justify-center rounded-lg text-[11px] font-semibold text-violet-600 hover:bg-violet-50"
            >
              View all
            </Link>
            <Link
              href="/activities/reminders/create"
              onClick={() => setPanel(null)}
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-[#5A32A3] text-[11px] font-semibold text-white hover:bg-[#4c2a8a]"
            >
              Add reminder
            </Link>
          </div>
        </PanelCard>
      ) : null}

      {panel === "recent" ? (
        <PanelCard className="left-2 w-[300px] max-w-[calc(100vw-1rem)]" title="Recent Items">
          <ul className="max-h-72 overflow-y-auto py-1">
            {recent.map((item) => (
              <li key={`${item.href}-${item.at}`}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted/70"
                >
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {item.title}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {item.href}
                  </span>
                </button>
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                Pages you open will appear here
              </li>
            ) : null}
          </ul>
        </PanelCard>
      ) : null}

      <SoftphonePad
        open={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        anchor={phoneAnchor}
        presetNumber={phoneNumber}
        placementKey={phonePlacement}
      />
      <StickyNotePad
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        onNotesChange={(items) => setNoteCount(items.length)}
      />
    </footer>
  );
}

function ToolButton({
  label,
  icon: Icon,
  badge,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        "relative flex min-w-[52px] flex-col items-center justify-center gap-px px-1.5 text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-900",
        active && "bg-violet-50 text-[#5A32A3] dark:bg-violet-950/40",
      )}
    >
      <span className="relative">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {badge ? (
          <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] leading-none whitespace-nowrap">{label}</span>
    </button>
  );
}

function PanelCard({
  className,
  title,
  children,
}: {
  className?: string;
  title: string | null;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-zinc-950",
        menuEnter,
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border px-3 py-2">
          <p className="text-[12px] font-semibold text-foreground">{title}</p>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function QuickAddRow({
  item,
  onSelect,
}: {
  item: { label: string; href: string; icon: LucideIcon };
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-foreground hover:bg-violet-50 dark:hover:bg-violet-950/30"
    >
      <Icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
      {item.label}
    </button>
  );
}
