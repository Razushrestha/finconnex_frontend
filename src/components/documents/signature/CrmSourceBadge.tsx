import { cn } from "@/lib/utils";

export function CrmSourceBadge({
  source,
  loading,
  error,
  label,
}: {
  source: "api" | "demo";
  loading?: boolean;
  error?: string | null;
  label?: string;
}) {
  const text =
    source === "api" ? "Live CRM" : loading ? "Connecting…" : "Demo";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          source === "api"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500",
        )}
      >
        {label ? `${label} · ${text}` : text}
      </span>
      {error && source === "demo" ? (
        <span className="max-w-[280px] truncate text-[10px] text-slate-500">
          {error}
        </span>
      ) : null}
    </span>
  );
}
