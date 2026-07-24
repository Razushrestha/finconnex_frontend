"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
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
  section,
  sectionIcon: SectionIcon,
  actions,
  children,
  showModuleNav = true,
}: Props) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/finance" className="hover:text-slate-600">
                Sales Ops
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              {SectionIcon ? <SectionIcon className="h-2.5 w-2.5" /> : null}
              {section}
            </span>
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
