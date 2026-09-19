import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function HubPromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3B2A8A] via-[#5B3BB8] to-[#7C5CF0] p-5 text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-6 bottom-0 h-28 w-40 rounded-tl-[80px] bg-fuchsia-400/30 blur-2xl" />
        <div className="absolute right-8 bottom-0 h-16 w-24 rounded-t-full bg-amber-200/40" />
        <div className="absolute right-20 bottom-0 h-20 w-28 rounded-t-[40px] bg-indigo-300/50" />
        <div className="absolute right-2 top-4 text-2xl opacity-80">✈</div>
      </div>
      <p className="relative text-[15px] font-bold">Smarter Sales Operations</p>
      <p className="relative mt-1 max-w-[220px] text-[11px] leading-relaxed text-white/80">
        Better insights. Faster decisions. Greater growth.
      </p>
      <Link
        href="/finance/invoices"
        className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-white hover:underline"
      >
        View Full History
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
