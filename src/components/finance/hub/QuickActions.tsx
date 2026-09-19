"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, PackagePlus, Plus, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    label: "New Invoice",
    hint: "Create a new invoice for your client",
    href: "/finance/invoices/create?layoutid=standard&redirect=false",
    icon: Plus,
    wrap: "bg-violet-100 text-violet-600",
    card: "from-white to-violet-50/80",
  },
  {
    label: "New Credit Note",
    hint: "Issue a credit note for a refund",
    href: "/finance/credit-notes/create?layoutid=standard&redirect=false",
    icon: RefreshCcw,
    wrap: "bg-teal-100 text-teal-600",
    card: "from-white to-teal-50/80",
  },
  {
    label: "Create Quote",
    hint: "Prepare a new quote for your prospect",
    href: "/finance/quotations/create?layoutid=standard&redirect=false",
    icon: FileText,
    wrap: "bg-orange-100 text-orange-600",
    card: "from-white to-orange-50/80",
  },
  {
    label: "Add Item",
    hint: "Add a new product or service",
    href: "/finance/products/create?layoutid=standard&redirect=false",
    icon: PackagePlus,
    wrap: "bg-pink-100 text-pink-600",
    card: "from-white to-rose-50/80",
  },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-slate-900">
            <span className="text-[#6D5AE6]">⚡</span> Quick Actions
          </h3>
          <p className="text-[11px] text-slate-400">Get things done faster</p>
        </div>
        <Link
          href="/finance/invoices"
          className="text-[11px] font-semibold text-[#6D5AE6] hover:underline"
        >
          View All Actions →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => router.push(action.href)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                action.card,
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  action.wrap,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-slate-800">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                  {action.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
