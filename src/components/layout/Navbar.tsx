"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/layout/SearchModal";

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  collapsed?: boolean;
  newLeadsCount?: number;
  user?: {
    name: string;
    role: string;
    email?: string;
    tenantName?: string;
    avatarUrl?: string;
  };
}

export function Navbar({
  onToggleSidebar,
  onOpenMobileMenu,
  collapsed = false,
  newLeadsCount = 27,
  user = { name: "John Smith", role: "Manager" },
}: NavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch — theme isn't known until mounted on the client
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  }

  const activeTheme = mounted ? theme : "light";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-2 bg-background px-3 sm:gap-3 sm:px-4 md:gap-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted md:flex"
      >
        <ChevronsLeft
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </button>

      {/* Mobile: open the off-canvas drawer */}
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
        aria-label="Search"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted sm:w-auto sm:flex-1 sm:max-w-xs sm:justify-start sm:gap-2 sm:px-4"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="hidden w-full truncate text-left text-sm text-muted-foreground sm:inline">
          Search anything&apos;s
        </span>
      </button>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {user.tenantName && (
        <div className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 lg:flex dark:border-violet-900 dark:bg-violet-950">
          <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          <span className="max-w-[140px] truncate text-sm font-medium text-violet-700 dark:text-violet-300">
            {user.tenantName}
          </span>
        </div>
      )}

      <div className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-border px-4 md:flex">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          Today New Leads
        </span>
        <Badge className="rounded-full bg-violet-100 px-2 py-0 text-xs font-semibold text-violet-600 hover:bg-violet-100 dark:bg-violet-900 dark:text-violet-300">
          {newLeadsCount}
        </Badge>
      </div>

      <div className="flex-1" />

      <div className="hidden h-10 shrink-0 items-center gap-1 rounded-full bg-muted p-1 sm:flex">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label="Light mode"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            activeTheme === "light"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground",
          )}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label="Dark mode"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            activeTheme === "dark"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground",
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Messages"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-10 sm:w-10"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:h-10 sm:w-10"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Calendar"
          className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted sm:flex"
        >
          <Calendar className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex shrink-0 items-center gap-2 rounded-full pl-1 hover:bg-muted sm:pl-2"
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
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card py-1 shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {user.name}
              </p>
              {user.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
              {user.tenantName && (
                <p className="mt-1 truncate text-xs text-violet-600 dark:text-violet-400">
                  {user.tenantName}
                </p>
              )}
            </div>
            <button
              type="button"
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
