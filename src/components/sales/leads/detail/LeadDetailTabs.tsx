"use client";

import {
  AlignLeft,
  CircleDollarSign,
  Clock,
  FileText,
  Home,
  Landmark,
  MessageSquare,
  SquareCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeadDetailTabId =
  | "overview"
  | "details"
  | "financials"
  | "strategy"
  | "conversation"
  | "activities"
  | "documents"
  | "notes"
  | "timeline";

const TABS: {
  id: LeadDetailTabId;
  label: string;
  icon: LucideIcon;
  badgeKey?: "conversation" | "activities";
}[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "details", label: "Lead Details", icon: User },
  { id: "financials", label: "Financials", icon: CircleDollarSign },
  { id: "strategy", label: "Loan Strategy", icon: Landmark },
  {
    id: "conversation",
    label: "Conversation",
    icon: MessageSquare,
    badgeKey: "conversation",
  },
  {
    id: "activities",
    label: "Activities",
    icon: SquareCheck,
    badgeKey: "activities",
  },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "notes", label: "Notes", icon: AlignLeft },
  { id: "timeline", label: "Timeline", icon: Clock },
];

export function LeadDetailTabs({
  active,
  onChange,
  conversationCount,
  activitiesCount,
}: {
  active: LeadDetailTabId;
  onChange: (id: LeadDetailTabId) => void;
  conversationCount: number;
  activitiesCount: number;
}) {
  const badges = {
    conversation: conversationCount,
    activities: activitiesCount,
  };

  return (
    <nav
      aria-label="Lead sections"
      className="-mx-4 mt-2.5 flex w-[calc(100%+2rem)] overflow-hidden rounded-b-2xl border-t border-slate-200 bg-[#FAF9FC]"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        const badge = tab.badgeKey ? badges[tab.badgeKey] : 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
              selected
                ? "bg-white text-orange-500"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
            )}
          >
            <span className="inline-flex items-center gap-1">
              <span className="relative inline-flex h-4 items-center justify-center">
                <Icon className="h-3.5 w-3.5" />
                {badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="leading-tight whitespace-nowrap">{tab.label}</span>
            </span>
            {selected ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-orange-500" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
