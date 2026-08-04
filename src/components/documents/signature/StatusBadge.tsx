import { cn } from "@/lib/utils";
import type { SignatureStatus } from "@/lib/documents/signature/types";

export const STATUS_STYLE: Record<
  SignatureStatus,
  { soft: string; dot: string }
> = {
  Draft: { soft: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  Sent: { soft: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  Viewed: { soft: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  Signed: { soft: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Declined: { soft: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  Expired: { soft: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  Cancelled: { soft: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

export function StatusBadge({ status }: { status: SignatureStatus }) {
  const meta = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        meta.soft,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {status}
    </span>
  );
}
