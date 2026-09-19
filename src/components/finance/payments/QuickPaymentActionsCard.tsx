"use client";

import { useRouter } from "next/navigation";
import { Send, RefreshCw, SlidersHorizontal, FileText, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickPaymentActionsCard({
  live = false,
  onRecordPayment,
}: {
  live?: boolean;
  onRecordPayment?: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">Quick Payment Actions</h3>
          <p className="text-[11px] text-slate-400">
            Streamlined workflows for handling settlements and client charges.
          </p>
        </div>
        <Zap className="h-4 w-4 text-violet-600" />
      </div>

      <div className="space-y-2.5">
        <ActionRow
          icon={Send}
          iconClass="bg-violet-100 text-violet-600"
          title="Send Payment Link"
          hint="Generate SMS or email direct checkout"
          onClick={() => onRecordPayment?.() ?? router.push("/finance/payments?create=1")}
        />
        <ActionRow
          icon={RefreshCw}
          iconClass="bg-sky-100 text-sky-600"
          title="Batch Bank Reconciliation"
          hint="Match bank feeds to open bills"
          onClick={() => router.push("/finance/invoices")}
        />
        <ActionRow
          icon={SlidersHorizontal}
          iconClass="bg-emerald-100 text-emerald-600"
          title="Manage Gateways"
          hint="Workspace payment settings"
          onClick={() => router.push("/settings")}
        />
        <ActionRow
          icon={FileText}
          iconClass="bg-orange-100 text-orange-600"
          title="Download Remittance Advice"
          hint="Generate consolidated statements"
          onClick={() => router.push("/reports")}
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-slate-300")} />
          {live ? "Live CRM payments" : "Demo payments"}
        </span>
      </div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  iconClass,
  title,
  hint,
  onClick,
}: {
  icon: typeof Send;
  iconClass: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:border-violet-200 hover:bg-violet-50/40"
    >
      <span className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-xs font-bold text-slate-900">{title}</span>
          <span className="block text-[11px] text-slate-400">{hint}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}
