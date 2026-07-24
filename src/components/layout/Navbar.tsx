"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronsLeft,
  Menu,
  Search,
  Sun,
  Moon,
  MessageSquare,
  Calendar,
  ChevronDown,
  LogOut,
  Building2,
  Settings,
  UserRound,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { menuEnter, badgePop } from "@/lib/motion";
import { logAuth, onRulesChange } from "@/lib/rules";
import { listLeadColumns } from "@/lib/leads/store";
import { listInboxConversations } from "@/lib/marketing/inbox/types";
import { SearchModal } from "@/components/layout/SearchModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  collapsed?: boolean;
  /** Override live lead count (optional). */
  newLeadsCount?: number;
  user?: {
    name: string;
    role: string;
    email?: string;
    tenantName?: string;
    avatarUrl?: string;
  };
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Leads in New Lead column: live board store. */
function countNewLeads() {
  const col = listLeadColumns().find((c) => c.title === "New Lead");
  return col?.cards.length ?? 0;
}

function countInboxUnread() {
  return listInboxConversations().reduce((n, c) => n + (c.unreadCount ?? 0), 0);
}

export function Navbar({
  onToggleSidebar,
  onOpenMobileMenu,
  collapsed = false,
  newLeadsCount: newLeadsProp,
  user = { name: "John Smith", role: "Manager" },
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [newLeadsCount, setNewLeadsCount] = React.useState(newLeadsProp ?? 0);
  const [inboxUnread, setInboxUnread] = React.useState(0);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function refresh() {
      if (newLeadsProp === undefined) setNewLeadsCount(countNewLeads());
      setInboxUnread(countInboxUnread());
    }
    refresh();
    return onRulesChange(() => refresh());
  }, [newLeadsProp, pathname]);

  React.useEffect(() => {
    if (newLeadsProp !== undefined) setNewLeadsCount(newLeadsProp);
  }, [newLeadsProp]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌘K / Ctrl+K opens global search
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      logAuth("logout", user?.name || user?.email || "user");
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.assign("/login");
    } catch {
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  }

  const activeTheme = mounted ? (resolvedTheme ?? theme ?? "light") : "light";
  const tenantLabel = user.tenantName ?? "FinConnex HQ";
  const isInbox = pathname.startsWith("/marketing/inbox");
  const isCalendar = pathname.startsWith("/activities/calendar");
  const isLeads = pathname.startsWith("/sales/leads");
  const isSettingsOrg = pathname.startsWith("/settings/organization");

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-2 border-b border-border/60 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-4 md:gap-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted md:flex"
      >
        <ChevronsLeft
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </button>

      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search (Ctrl+K)"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80 sm:w-auto sm:max-w-xs sm:flex-1 sm:justify-start sm:gap-2 sm:px-4"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="hidden w-full truncate text-left text-sm text-muted-foreground sm:inline">
          Search anything&apos;s
        </span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      <Link
        href="/settings/organization"
        aria-label={`Organization: ${tenantLabel}`}
        className={cn(
          "hidden h-10 shrink-0 items-center gap-2 rounded-full border px-4 transition-colors lg:flex",
          isSettingsOrg
            ? "border-violet-300 bg-violet-100 dark:border-violet-700 dark:bg-violet-900/60"
            : "border-violet-100 bg-violet-50 hover:bg-violet-100/80 dark:border-violet-900 dark:bg-violet-950 dark:hover:bg-violet-900/50",
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        <span className="max-w-[140px] truncate text-sm font-medium text-violet-700 dark:text-violet-300">
          {tenantLabel}
        </span>
      </Link>

      <Link
        href="/sales/leads"
        aria-label={`${newLeadsCount} new leads today`}
        className={cn(
          "hidden h-10 shrink-0 items-center gap-2 rounded-full border px-4 transition-colors md:flex",
          isLeads
            ? "border-violet-300 bg-violet-50 dark:border-violet-700"
            : "border-border hover:bg-muted/60",
        )}
      >
        <span className="whitespace-nowrap text-sm font-medium text-foreground">
          Today New Leads
        </span>
        <Badge
          key={newLeadsCount}
          className={cn(
            "rounded-full bg-violet-600 px-2 py-0 text-xs font-semibold text-white hover:bg-violet-600 dark:bg-violet-500",
            badgePop,
          )}
        >
          {newLeadsCount}
        </Badge>
      </Link>

      <div className="flex-1" />

      <div
        className="hidden h-10 shrink-0 items-center gap-1 rounded-full bg-muted p-1 sm:flex"
        role="group"
        aria-label="Theme"
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label="Light mode"
          aria-pressed={activeTheme === "light"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            activeTheme === "light"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label="Dark mode"
          aria-pressed={activeTheme === "dark"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            activeTheme === "dark"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Link
          href="/marketing/inbox"
          aria-label={
            inboxUnread > 0
              ? `Messages, ${inboxUnread} unread`
              : "Messages"
          }
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-10 sm:w-10",
            isInbox
              ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <MessageSquare className="h-[18px] w-[18px]" />
          {inboxUnread > 0 ? (
            <span className="absolute top-2 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
              {inboxUnread > 9 ? "9+" : inboxUnread}
            </span>
          ) : (
            <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
          )}
        </Link>

        <NotificationBell />

        <Link
          href="/activities/calendar"
          aria-label="Calendar"
          className={cn(
            "hidden h-10 w-10 items-center justify-center rounded-full transition-colors sm:flex",
            isCalendar
              ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Calendar className="h-[18px] w-[18px]" />
        </Link>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 transition-colors hover:bg-muted sm:pl-2"
        >
          <div className="hidden text-right leading-tight lg:block">
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  menuOpen && "rotate-180",
                )}
              />
              {user.role}
            </span>
          </div>
          <div className="relative">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {userInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500"
              title="Online"
              aria-hidden
            />
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg",
              menuEnter,
            )}
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {user.name}
              </p>
              {user.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
              <p className="mt-1 truncate text-xs text-violet-600 dark:text-violet-400">
                {tenantLabel} · {user.role}
              </p>
            </div>
            <Link
              href="/settings/my-preferences"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <UserRound className="h-4 w-4 text-muted-foreground" />
              My Preferences
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                router.push("/activities/team-chat");
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted sm:hidden"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Team Chat
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
