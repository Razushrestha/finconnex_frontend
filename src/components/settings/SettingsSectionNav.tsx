"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  Briefcase,
  GitBranch,
  MessageSquare,
  FileText,
  Layout,
  DollarSign,
  Cpu,
  Puzzle,
  Shield,
  Bell,
  BarChart3,
  Database,
  Store,
  CreditCard,
  Code,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { SETTINGS_CATEGORIES } from "@/lib/settings/settings-config";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Users,
  Briefcase,
  GitBranch,
  MessageSquare,
  FileText,
  Layout,
  DollarSign,
  Cpu,
  Puzzle,
  Shield,
  Bell,
  BarChart3,
  Database,
  Store,
  CreditCard,
  Code,
  Settings,
  HelpCircle,
};

export function SettingsSectionNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1920px] gap-1 overflow-x-auto px-4 py-2 scrollbar-none sm:px-6 2xl:px-8">
        {SETTINGS_CATEGORIES.map((cat) => {
          const active = pathname?.startsWith(`/settings/${cat.slug}`);
          const Icon = iconMap[cat.icon] || Settings;
          return (
            <Link
              key={cat.slug}
              href={`/settings/${cat.slug}`}
              title={`${cat.section} ${cat.title}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{cat.title}</span>
              <span className="lg:hidden">{cat.section.replace("27.", "")}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
