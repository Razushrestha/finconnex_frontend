"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  X,
  LayoutGrid,
  MessageSquareText,
  Calendar,
  Users,
  Handshake,
  Mail,
  LifeBuoy,
  Settings,
  Bell,
  Inbox,
  CheckSquare,
  Scale,
  Building2,
  FileText,
  StickyNote,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrmRecordSearch } from "@/lib/search/use-crm-record-search";
import type { CrmRecordSearchHit } from "@/lib/search/api";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}

/** Real app routes: kept in sync with Sidebar destinations. */
const DESTINATIONS: SearchItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid, keywords: ["dashboard", "home"] },
  { label: "Leads", href: "/sales/leads", icon: Users, keywords: ["leads", "sales", "prospect"] },
  { label: "Contacts", href: "/sales/contacts", icon: Users, keywords: ["contacts"] },
  { label: "Deals", href: "/sales/deals", icon: Handshake, keywords: ["deals", "pipeline"] },
  { label: "Tasks", href: "/activities/tasks", icon: CheckSquare, keywords: ["tasks"] },
  { label: "Calendar", href: "/activities/calendar", icon: Calendar, keywords: ["calendar"] },
  { label: "Team Chat", href: "/activities/team-chat", icon: MessageSquareText, keywords: ["team chat", "chat", "dm"] },
  { label: "Messages", href: "/marketing/inbox", icon: MessageSquareText, keywords: ["messages", "chat", "whatsapp", "sms"] },
  { label: "Emails", href: "/activities/emails", icon: Mail, keywords: ["emails"] },
  { label: "Inbox", href: "/marketing/inbox", icon: Inbox, keywords: ["inbox", "omni", "sms", "whatsapp", "unified"] },
  { label: "Email Campaigns", href: "/marketing/email", icon: Mail, keywords: ["email campaigns", "campaigns"] },
  { label: "Support", href: "/support", icon: LifeBuoy, keywords: ["support", "ticket"] },
  { label: "Notifications", href: "/notifications", icon: Bell, keywords: ["notifications"] },
  { label: "Rules", href: "/rules", icon: Scale, keywords: ["rules"] },
  { label: "Users", href: "/users", icon: Users, keywords: ["users", "invite", "role", "members"] },
  { label: "Settings", href: "/settings", icon: Settings, keywords: ["settings"] },
  { label: "My Preferences", href: "/settings/my-preferences", icon: Settings, keywords: ["preferences", "theme"] },
];

const RECENT_KEY = "finconnex:search-recent:v1";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(hrefs: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(hrefs.slice(0, 6)));
}

function iconForRecordType(type: string): LucideIcon {
  const key = type.toLowerCase();
  if (key.includes("lead") || key.includes("contact")) return Users;
  if (key.includes("compan")) return Building2;
  if (key.includes("deal")) return Handshake;
  if (key.includes("email")) return Mail;
  if (key.includes("meeting") || key.includes("calendar")) return Calendar;
  if (key.includes("task")) return CheckSquare;
  if (key.includes("note")) return StickyNote;
  if (key.includes("call")) return Phone;
  if (key.includes("ticket") || key.includes("support")) return LifeBuoy;
  if (key.includes("invoice") || key.includes("quote") || key.includes("estimate")) {
    return FileText;
  }
  return Search;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [recentHrefs, setRecentHrefs] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const records = useCrmRecordSearch(query);

  React.useEffect(() => {
    if (open) {
      setRecentHrefs(readRecent());
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DESTINATIONS.filter((d) => {
      const hay = (d.keywords ?? []).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 10);
  }, [query]);

  const recentItems = React.useMemo(() => {
    return recentHrefs
      .map((href) => DESTINATIONS.find((d) => d.href === href))
      .filter(Boolean) as SearchItem[];
  }, [recentHrefs]);

  const showRecent = !query.trim();
  const list = showRecent
    ? recentItems.length > 0
      ? recentItems
      : DESTINATIONS.slice(0, 6)
    : filtered;

  function go(href: string, remember = true) {
    if (remember) {
      const next = [href, ...readRecent().filter((h) => h !== href)];
      writeRecent(next);
      setRecentHrefs(next);
    }
    onOpenChange(false);
    router.push(href);
  }

  function goNav(item: SearchItem) {
    go(item.href, true);
  }

  function goRecord(hit: CrmRecordSearchHit) {
    go(hit.href, false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (records.hits[0]) {
      goRecord(records.hits[0]);
      return;
    }
    if (list[0]) goNav(list[0]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg gap-0 overflow-hidden rounded-2xl border-border p-0 shadow-xl"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        <div className="flex items-center gap-3 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search records or pages"
            className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search keywords"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-t border-border" />

        <div className="max-h-96 overflow-y-auto px-3 py-3">
          {!showRecent ? (
            <div className="mb-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Records
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    records.source === "api"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {records.loading
                    ? "Searching…"
                    : records.source === "api"
                      ? "Live CRM"
                      : records.source === "error"
                        ? "Offline"
                        : "Type to search"}
                </span>
              </div>
              {records.error && records.source === "error" ? (
                <p className="px-2 pt-1 text-[11px] text-slate-500">
                  {records.error}
                </p>
              ) : null}
              <div className="mt-1 flex flex-col">
                {records.hits.map((hit) => {
                  const Icon = iconForRecordType(hit.type);
                  return (
                    <button
                      key={`${hit.type}-${hit.id}`}
                      type="button"
                      onClick={() => goRecord(hit)}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Icon
                        className="h-[18px] w-[18px] shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {hit.title}
                        </span>
                        {hit.subtitle ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {hit.type}
                      </span>
                    </button>
                  );
                })}
                {!records.loading &&
                records.source === "api" &&
                records.hits.length === 0 ? (
                  <p className="px-2 py-2 text-[12px] text-slate-400">
                    No CRM records match
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <span className="px-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {showRecent
              ? recentItems.length > 0
                ? "Recently searched"
                : "Quick links"
              : filtered.length
                ? "Pages"
                : "No page matches"}
          </span>

          <div className="mt-1 flex flex-col">
            {list.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href + item.label}
                  type="button"
                  onClick={() => goNav(item)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800",
                  )}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.label}
                  </span>
                  <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                    {item.href}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchModal;
