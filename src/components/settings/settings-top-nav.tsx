"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_CATEGORIES } from "@/lib/settings/settings-config";
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
  LucideIcon,
} from "lucide-react";

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

export function SettingsTopNav() {
  const pathname = usePathname();

  return (
    <div className="bg-card border-b border-border px-6 py-2.5 shadow-2xs">
      <div className="flex space-x-2 overflow-x-auto scrollbar-none py-1">
        {SETTINGS_CATEGORIES.map((cat) => {
          const isActive = pathname?.startsWith(`/settings/${cat.slug}`);
          const IconComponent = iconMap[cat.icon] || Settings;

          return (
            <Link
              key={cat.slug}
              href={`/settings/${cat.slug}/${cat.items[0].slug}`}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 shadow-xs border border-orange-200/60 font-semibold dark:bg-indigo-950 dark:text-indigo-400 dark:border-orange-900/60"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent"
              }`}
            >
              <IconComponent
                className={`w-4 h-4 transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground"
                }`}
              />
              <span>{cat.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
