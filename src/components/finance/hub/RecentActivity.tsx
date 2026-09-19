"use client";

import Link from "next/link";
import { Banknote, FileCheck, FileWarning, Send } from "lucide-react";
import type { HubActivityItem, HubActivityTone } from "@/lib/finance/hub-metrics";
import { cn } from "@/lib/utils";

const TONE: Record<
  HubActivityTone,
  { icon: typeof Banknote; wrap: string; badge: string }
> = {
  payment: {
    icon: Banknote,
    wrap: "bg-violet-100 text-violet-600",
    badge: "bg-violet-100 text-violet-700",
  },
  approved: {
    icon: FileCheck,
    wrap: "bg-emerald-100 text-emerald-600",
    badge: "bg-rose-100 text-rose-600",
  },
  overdue: {
    icon: FileWarning,
    wrap: "bg-orange-100 text-orange-600",
    badge: "bg-rose-100 text-rose-600",
  },
  sent: {
    icon: Send,
    wrap: "bg-indigo-100 text-indigo-600",
    badge: "bg-violet-100 text-violet-700",
  },
};

export function RecentActivity({ items }: { items: HubActivityItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900">
            <span className="text-[#6D5AE6]">⚡</span> Recent Activity
          </h3>
          <p className="text-[11px] text-slate-400">
            Updates on quotes, invoices, and payments
          </p>
        </div>
        <Link
          href="/finance/invoices"
          className="shrink-0 text-[11px] font-semibold text-[#6D5AE6] hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="flex-1 space-y-0">
        {items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-[12px] text-slate-400">
            No recent finance activity yet.
          </p>
        ) : (
          items.map((item, index) => {
            const tone = TONE[item.tone];
            const Icon = tone.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 py-3",
                  index < items.length - 1 && "border-b border-slate-100",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    tone.wrap,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-slate-800">
                    {item.title}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {item.subtitle}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {item.time}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    tone.badge,
                  )}
                >
                  {item.badge}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
