"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadCardData } from "@/lib/leads/types";
import { LEAD_SEND_ACTIONS, leadSendHref } from "@/lib/leads/convert-actions";
import { sendClientPortalForLead } from "@/lib/portals/send-from-lead";

export function LeadConvertActions({
  card,
  onConvert,
  className,
}: {
  card: LeadCardData;
  onConvert?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sendingPortal, setSendingPortal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function onSendAction(id: (typeof LEAD_SEND_ACTIONS)[number]["id"]) {
    const item = LEAD_SEND_ACTIONS.find((row) => row.id === id);
    if (!item) return;
    setOpen(false);
    if (id === "portal") {
      if (sendingPortal) return;
      setSendingPortal(true);
      const result = await sendClientPortalForLead(card);
      setSendingPortal(false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Portal link sent to ${card.email}`, {
        description: result.url,
      });
      return;
    }
    const href = leadSendHref(item.href, card);
    router.push(href);
  }

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={onConvert}
        className="inline-flex h-8 items-center gap-1.5 rounded-l-xl px-3 text-[12px] font-semibold text-white hover:opacity-90"
        style={{ backgroundColor: "#5A32A3" }}
      >
        <Send className="h-3.5 w-3.5" />
        Convert to Deal
      </button>
      <button
        type="button"
        aria-label="More lead actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-7 items-center justify-center rounded-r-xl border-l border-white/20 text-white hover:opacity-90"
        style={{ backgroundColor: "#5A32A3" }}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-50 mt-1 max-h-[min(70vh,420px)] w-[230px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {onConvert ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onConvert();
              }}
              className="flex w-full px-3 py-2 text-left text-[13px] font-medium text-slate-800 hover:bg-violet-50"
            >
              Convert to Deal
            </button>
          ) : null}
          {LEAD_SEND_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.id === "portal" && sendingPortal}
              onClick={() => void onSendAction(item.id)}
              className="flex w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {item.id === "portal" && sendingPortal
                ? "Sending portal…"
                : item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
