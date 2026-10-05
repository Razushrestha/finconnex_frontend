"use client";

import Link from "next/link";
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
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  SETTINGS_CONTROL_PANEL,
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

export function SettingsHome() {
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-[#5A32A3] px-6 py-8 text-white shadow-lg shadow-[#5A32A3]/20 sm:px-8">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-2xl" />
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-violet-100 uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Workspace control panel
        </p>
        <h1 className="mt-2 max-w-xl text-[28px] leading-tight font-semibold tracking-tight">
          Run FinConnex from one place
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-violet-100">
          Brand, people, pipeline, mail, and backups — only the screens that
          actually change this CRM.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {SETTINGS_CONTROL_PANEL.map((group) => {
          const Icon = ICONS[group.icon];
          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#5A32A3] text-white shadow-sm shadow-[#5A32A3]/30">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-semibold text-slate-900">
                    {group.title}
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                    {group.description}
                  </p>
                </div>
                <Link
                  href={group.href}
                  className="mt-1 hidden text-[11px] font-semibold text-[#5A32A3] sm:inline"
                >
                  Open
                </Link>
              </div>
              <ul className="divide-y divide-slate-50 p-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[#F4F1FA]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-800">
                            {link.title}
                          </span>
                          {link.live ? (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold tracking-wide text-emerald-700 uppercase">
                              Live
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {link.blurb}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#5A32A3]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsGroupIcon({
  icon,
  className,
}: {
  icon: SettingsNavIcon;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return <Icon className={cn("h-4 w-4", className)} />;
}
