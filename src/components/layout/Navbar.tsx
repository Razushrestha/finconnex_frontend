"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  Search,
  MessageSquare,
  Calendar,
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { menuEnter } from "@/lib/motion";
import { logAuth } from "@/lib/rules";
import { clearCrmTokens } from "@/lib/activity-timeline/auth";
import { listInboxConversations } from "@/lib/marketing/inbox/types";
import { SearchModal } from "@/components/layout/SearchModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getModuleTitle } from "@/lib/module-title";
import { WorkQueuePersonBar } from "@/components/work-queue/WorkQueuePersonBar";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
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

function countInboxUnread() {
  return listInboxConversations().reduce((n, c) => n + (c.unreadCount ?? 0), 0);
}

export function Navbar({
  onOpenMobileMenu,
  user = { name: "John Smith", role: "Manager" },
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌘K / Ctrl+K opens global search
  useEffect(() => {
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
      clearCrmTokens();
      window.location.assign("/login");
    } catch {
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  }

  const tenantLabel = user.tenantName ?? "FinConnex HQ";
  const moduleTitle = getModuleTitle(pathname);
  const isInbox = pathname.startsWith("/marketing/inbox");
  const isCalendar = pathname.startsWith("/activities/calendar");
  const isWorkQueue = pathname.startsWith("/work-queue");

  return (
    <header className="sticky top-0 z-30 flex w-full flex-col border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 md:gap-4">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
        {moduleTitle}
      </h1>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search keywords (⌘K or Ctrl+K)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 sm:w-[16.5rem] sm:justify-start sm:gap-2 sm:px-3"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="hidden min-w-0 flex-1 truncate text-left text-sm sm:inline">
            Search keywords
          </span>
          <kbd className="ml-auto hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium tracking-tight sm:inline">
            ⌘/Ctrl K
          </kbd>
        </button>

        <Link
          href="/activities/team-chat"
          aria-label={
            inboxUnread > 0 ? `Messages, ${inboxUnread} unread` : "Messages"
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
              "absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg",
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
      </div>
      {isWorkQueue ? <WorkQueuePersonBar /> : null}
    </header>
  );
}

export default Navbar;
