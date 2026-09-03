"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import {
  leadCallTargets,
  startLeadApplicantCall,
  type LeadCallTarget,
} from "@/lib/leads/call-targets";
import { cn } from "@/lib/utils";

const MENU_W = 252;

export function useLeadCallFlow() {
  const [picker, setPicker] = useState<{
    card: LeadCardData;
    targets: LeadCallTarget[];
    anchor: HTMLElement;
  } | null>(null);

  const onCallClick = useCallback(
    (card: LeadCardData, anchor: HTMLElement | null) => {
      const targets = leadCallTargets(card);
      if (targets.length > 1) {
        if (anchor) setPicker({ card, targets, anchor });
        return;
      }
      const target = targets[0] ?? {
        id: "primary" as const,
        name: card.name,
        phone: (card.phone || card.mobilePhone || "").trim(),
        role: "Primary" as const,
      };
      const result = startLeadApplicantCall(card, target, anchor);
      if (!result.ok) toast.error(result.message);
    },
    [],
  );

  function onPick(target: LeadCallTarget) {
    if (!picker) return;
    const result = startLeadApplicantCall(
      picker.card,
      target,
      picker.anchor,
    );
    setPicker(null);
    if (!result.ok) toast.error(result.message);
  }

  return {
    onCallClick,
    picker: picker ? (
      <LeadCallPicker
        targets={picker.targets}
        anchor={picker.anchor}
        onSelect={onPick}
        onClose={() => setPicker(null)}
      />
    ) : null,
  };
}

function LeadCallPicker({
  targets,
  anchor,
  onSelect,
  onClose,
}: {
  targets: LeadCallTarget[];
  anchor: HTMLElement;
  onSelect: (target: LeadCallTarget) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + MENU_W > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - MENU_W - 8);
    }
    const approxH = 16 + targets.length * 64;
    if (top + approxH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - approxH - 6);
    }
    setPos({ left, top });
  }, [anchor, targets.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const node = e.target as Node;
      if (menuRef.current?.contains(node) || anchor.contains(node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Choose who to call"
      style={{ left: pos.left, top: pos.top, width: MENU_W }}
      className="fixed z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        Who to call
      </p>
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(target)}
          className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-[#F3ECFB]"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3ECFB] text-[#5A32A3]">
            <Phone className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-slate-800">
              {target.name}
            </span>
            <span
              className={cn(
                "block truncate text-[11px]",
                target.phone ? "text-slate-500" : "text-rose-500",
              )}
            >
              {target.phone || "No number"}
            </span>
            <span className="mt-0.5 inline-block text-[10px] font-medium text-slate-400">
              {target.role} applicant
            </span>
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
