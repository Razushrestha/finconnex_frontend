"use client";

import type { ElementType } from "react";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  CheckSquare,
  LifeBuoy,
  Receipt,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { usePortalContext } from "@/components/portals/public/PortalShell";
import type { PortalModule } from "@/lib/portals/types";

const ICONS: Record<PortalModule, ElementType> = {
  Deals: Briefcase,
  Documents: FileText,
  Tasks: CheckSquare,
  Tickets: LifeBuoy,
  Invoices: Receipt,
  Reports: BarChart3,
};

export function PortalHomeClient({ slug }: { slug: string }) {
  const { portal, modules } = usePortalContext(slug);

  if (!portal) return null;

  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        Welcome back
      </h2>
      <p className="mt-1 max-w-xl text-sm text-slate-500">
        Everything for {portal.clientName} in one place: deal status, documents
        to sign, invoices to pay, and support tickets.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = ICONS[m];
          const href = `/p/${slug}/${m.toLowerCase()}`;
          return (
            <Link
              key={m}
              href={href}
              className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{m}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {m === "Invoices"
                    ? "View balances and pay"
                    : m === "Tickets"
                      ? "Raise or track support"
                      : m === "Documents"
                        ? "Review and sign"
                        : `Open ${m.toLowerCase()}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
