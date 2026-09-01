import { cn } from "@/lib/utils";

export function PortalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", compact && "gap-2")}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-[#5A32A3] font-bold text-white shadow-sm",
          compact ? "h-8 w-8 text-[15px]" : "h-10 w-10 text-lg",
        )}
      >
        F
      </div>
      <div className="min-w-0 leading-tight">
        <div className={cn("font-bold tracking-tight text-slate-900", compact ? "text-[13px]" : "text-[15px]")}>
          FinConnex
        </div>
        <div className="text-[9px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Financial Services
        </div>
      </div>
    </div>
  );
}

export function InitialsAvatar({
  initials,
  size = "md",
  tone = "purple",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: "purple" | "slate";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" && "h-7 w-7 text-[10px]",
        size === "md" && "h-10 w-10 text-[13px]",
        size === "lg" && "h-14 w-14 text-[16px]",
        tone === "purple"
          ? "bg-[#5A32A3] text-white"
          : "bg-slate-200 text-slate-600",
      )}
    >
      {initials}
    </div>
  );
}
