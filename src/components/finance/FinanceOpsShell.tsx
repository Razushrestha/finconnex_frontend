"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FileText,
  Receipt,
  Banknote,
  Package,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const FINANCE_MODULE_NAV: {
  href: string;
  label: string;
  section?: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
}[] = [
  {
    href: "/finance",
    label: "Hub",
    icon: LayoutGrid,
    match: "exact",
  },
  {
    href: "/finance/estimates",
    label: "Estimates",
    section: "§20.1",
    icon: FileText,
  },
  {
    href: "/finance/quotations",
    label: "Quotations",
    section: "§20.2",
    icon: FileText,
  },
  {
    href: "/finance/invoices",
    label: "Invoices",
    section: "§20.3",
    icon: Receipt,
  },
  {
    href: "/finance/payments",
    label: "Payments",
    section: "§20.4",
    icon: Banknote,
  },
  {
    href: "/finance/products",
    label: "Items",
    section: "§20.5",
    icon: Package,
  },
];

interface Props {
  title: string;
  section: string;
  sectionIcon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  /** Hide module strip on nested create pages if needed */
  showModuleNav?: boolean;
}

export function FinanceOpsShell({
  title,
  section: _section,
  sectionIcon: _SectionIcon,
  actions,
  children,
  showModuleNav = true,
}: Props) {
  void _section;
  void _SectionIcon;
  const pathname = usePathname();

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div className="relative mx-auto flex max-w-[1920px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              {title}
            </h1>
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
          ) : null}
        </div>

        {showModuleNav ? (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {FINANCE_MODULE_NAV.map((item) => {
              const active =
                item.match === "exact"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold transition-colors",
                    active
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:border-violet-200 hover:text-violet-700",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
