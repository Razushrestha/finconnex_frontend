"use client";

import { useEffect, useState } from "react";
import { listCrmCalculations } from "@/lib/calculator/api";
import { cn } from "@/lib/utils";

export function CalculatorSourceBadge({ className }: { className?: string }) {
  const [source, setSource] = useState<"loading" | "api" | "demo">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listCrmCalculations({ limit: 1 });
        if (cancelled) return;
        setSource("api");
        setError(null);
        void rows;
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Calculations API unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <span
        title={error ?? undefined}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
          source === "api"
            ? "bg-emerald-50 text-emerald-700"
            : source === "loading"
              ? "bg-slate-100 text-slate-500"
              : "bg-amber-50 text-amber-800",
        )}
      >
        {source === "api" ? "Active" : source === "loading" ? "Connecting…" : "Demo"}
      </span>
      {source === "loading" ? (
        <span className="text-[10px] leading-tight text-slate-400">
          Checking CRM connection
        </span>
      ) : null}
      {source === "demo" ? (
        <span className="max-w-[220px] text-right text-[10px] leading-tight text-slate-400">
          Saves stay on this device
        </span>
      ) : null}
      {source === "api" ? (
        <span className="text-[10px] leading-tight text-emerald-700/80">
          Saves go to CRM
        </span>
      ) : null}
    </div>
  );
}
