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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {SETTINGS_CONTROL_PANEL.map((group) => {
          const Icon = ICONS[group.icon];
          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm shadow-[var(--brand-primary)]/30">
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
                  className="mt-1 hidden text-[11px] font-semibold text-[var(--brand-primary)] sm:inline"
                >
                  Open
                </Link>
              </div>
              <ul className="divide-y divide-slate-50 p-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[var(--brand-primary-soft)]"
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
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--brand-primary)]" />
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
