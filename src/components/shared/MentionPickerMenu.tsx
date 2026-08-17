"use client";

import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MentionPerson } from "@/lib/mentions/people";

interface MentionPickerMenuProps {
  open: boolean;
  people: MentionPerson[];
  highlightIndex: number;
  menuRef: React.RefObject<HTMLDivElement | null>;
  position: { top: number; left: number; width: number };
  onPick: (person: MentionPerson) => void;
  onHighlight: (index: number) => void;
}

export function MentionPickerMenu({
  open,
  people,
  highlightIndex,
  menuRef,
  position,
  onPick,
  onHighlight,
}: MentionPickerMenuProps) {
  if (!open || people.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
    >
      <div className="border-b border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
        Assign to
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {people.map((person, index) => (
          <li key={person.id}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onPick(person)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-violet-50",
                index === highlightIndex && "bg-violet-50",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-slate-800">
                  {person.name}
                </span>
                <span className="block truncate text-[11px] text-slate-600">
                  {[person.role, person.team, person.email]
                    .filter(Boolean)
                    .join(" · ") || "Team member"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}
