"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Kanban,
  GitBranch,
  Mail,
  Database,
  FolderOpen,
  CreditCard,
  UserRound,
  Search,
  type LucideIcon,
} from "lucide-react";
import { SettingsCrmBadge } from "@/components/settings/SettingsCrmBadge";
import { SettingsBreadcrumb } from "@/components/settings/SettingsBreadcrumb";
import {
  SETTINGS_CONTROL_PANEL,
  searchSettingsNav,
  settingsGroupForPath,
  type SettingsNavIcon,
} from "@/lib/settings/settings-nav";
import { cn } from "@/lib/utils";

const ICONS: Record<SettingsNavIcon, LucideIcon> = {
  workspace: Building2,
  people: Users,
  pipeline: Kanban,
  automation: GitBranch,
  channels: Mail,
  data: Database,
  documents: FolderOpen,
  billing: CreditCard,
  me: UserRound,
};

export function SettingsControlShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/settings";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const activeGroup = settingsGroupForPath(pathname);
  const results = useMemo(() => searchSettingsNav(query), [query]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F4F1FA]">
      <header className="z-20 shrink-0 border-b border-[#5A32A3]/10 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#5A32A3] uppercase">
                Settings
              </p>
              <SettingsCrmBadge />
            </div>
            <SettingsBreadcrumb />
          </div>
          <label className="relative hidden min-w-[220px] max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings…"
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/80 pr-3 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3] focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/15"
            />
            {query.trim() ? (
              <ul className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
                {results.length === 0 ? (
                  <li className="px-3 py-4 text-center text-[12px] text-slate-400">
                    No matches
                  </li>
                ) : (
                  results.slice(0, 8).map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50"
                        onClick={() => {
                          router.push(item.href);
                          setQuery("");
                        }}
                      >
                        <span className="text-[13px] font-semibold text-slate-800">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.blurb}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </label>
          <Link
            href="/settings/my-preferences"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#5A32A3] px-3.5 text-[12px] font-semibold text-white shadow-sm shadow-[#5A32A3]/25 hover:brightness-95"
          >
            <UserRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">My preferences</span>
          </Link>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-3 py-2 md:hidden">
        {SETTINGS_CONTROL_PANEL.map((group) => {
          const active = activeGroup?.id === group.id;
          return (
            <Link
              key={group.id}
              href={group.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap",
                active
                  ? "bg-[#5A32A3] text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {group.title}
            </Link>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[248px] shrink-0 overflow-y-auto border-r border-[#5A32A3]/10 bg-white px-3 py-4 md:block">
          <Link
            href="/settings"
            className={cn(
              "mb-2 flex items-center rounded-xl px-3 py-2 text-[12px] font-semibold",
              pathname === "/settings"
                ? "bg-[#5A32A3] text-white"
                : "text-slate-500 hover:bg-violet-50 hover:text-[#5A32A3]",
            )}
          >
            All settings
          </Link>
          <nav className="space-y-0.5">
            {SETTINGS_CONTROL_PANEL.map((group) => {
              const Icon = ICONS[group.icon];
              const active = activeGroup?.id === group.id;
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--brand-primary,#5A32A3)_12%,white)] text-[#5A32A3]"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-[#5A32A3] text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">
                      {group.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                      {group.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
