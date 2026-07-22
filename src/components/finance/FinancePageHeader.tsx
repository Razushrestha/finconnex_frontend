import Link from "next/link";
import { Home, ChevronRight, FileText, Receipt, Banknote, Package } from "lucide-react";

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
    <div className="mb-6">
      <nav className="mb-3 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="flex items-center gap-1.5 hover:text-slate-600">
          <Home className="h-4 w-4" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-500">Finance</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">{currentPage}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Finance overview
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Proposal → payment pipeline · §13 / §20
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
