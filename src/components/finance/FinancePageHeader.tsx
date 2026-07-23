import Link from "next/link";
import { Home, FileText, Receipt, Banknote, Package } from "lucide-react";

const LINKS = [
  { href: "/finance/estimates", label: "Estimates", icon: FileText },
  { href: "/finance/quotations", label: "Quotations", icon: FileText },
  { href: "/finance/invoices", label: "Invoices", icon: Receipt },
  { href: "/finance/payments", label: "Payments", icon: Banknote },
  { href: "/finance/products", label: "Products", icon: Package },
] as const;

interface FinancePageHeaderProps {
  currentPage?: string;
}

export function FinancePageHeader({
  currentPage = "Overview",
}: FinancePageHeaderProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-slate-200/80 pb-2 dark:border-zinc-800">
      <nav className="flex items-center gap-1 text-[11px] text-slate-400">
        <Link href="/" className="hover:text-slate-600" aria-label="Home">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <span>/</span>
        <span className="text-slate-500">Finance</span>
        <span>/</span>
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {currentPage}
        </span>
      </nav>

      <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-zinc-700" />

      <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
        Finance overview
      </h1>

      <div className="ml-auto flex flex-wrap gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300"
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
