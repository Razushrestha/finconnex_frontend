"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronsLeft,
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
  collapsed = false,
  newLeadsCount = 27,
  user = { name: "John Smith", role: "Manager" },
}: NavbarProps) {
  const router = useRouter();
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 bg-white px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
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
        onClick={() => setSearchOpen(true)}
        className="flex h-10 max-w-xs flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 text-left"
      >
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="w-full truncate text-sm text-gray-400">
          Search anything&apos;s
        </span>
      </button>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {user.tenantName && (
        <div className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 md:flex">
          <Building2 className="h-3.5 w-3.5 text-violet-600" />
          <span className="max-w-[140px] truncate text-sm font-medium text-violet-700">
            {user.tenantName}
          </span>
        </div>
      )}

      <div className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-gray-200 px-4">
        <span className="text-sm font-medium text-gray-800">
          Today New Leads
        </span>
        <Badge className="rounded-full bg-violet-100 px-2 py-0 text-xs font-semibold text-violet-600 hover:bg-violet-100">
          {newLeadsCount}
        </Badge>
      </div>

      <div className="flex-1" />

      <div className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label="Light mode"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            theme === "light" ? "bg-white shadow-sm" : "text-gray-400",
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
            theme === "dark" ? "bg-white shadow-sm" : "text-gray-400",
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Messages"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Calendar"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <Calendar className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex shrink-0 items-center gap-2 rounded-full pl-2 hover:bg-gray-50"
        >
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
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
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              {user.email && (
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              )}
              {user.tenantName && (
                <p className="mt-1 truncate text-xs text-violet-600">
                  {user.tenantName}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
