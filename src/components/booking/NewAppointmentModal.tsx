"use client";

import { useEffect } from "react";
import { useContentArea } from "@/hooks/useContentArea";
import ScheduleMeetingPage, {
  type ScheduleMeetingSeed,
} from "@/app/(dashboard)/activities/meetings/create/page";
import { cn } from "@/lib/utils";

/** Booking "New Appointment" opens the Schedule Meeting form in a dialog. */
export function NewAppointmentModal({
  open,
  title = "Schedule Meeting",
  onClose,
  onCreated,
  initial,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCreated: () => void;
  initial?: ScheduleMeetingSeed;
}) {
  const area = useContentArea(open);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={cn(
        "fixed z-[80] flex items-center justify-center bg-slate-900/45 p-3 sm:p-4",
        !area && "inset-0",
      )}
      style={area ?? undefined}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ScheduleMeetingPage
            key={
              initial
                ? `${title}-${initial.contactName ?? ""}-${initial.date ?? ""}-${initial.time ?? ""}`
                : "new"
            }
            heading={title}
            embedded
            initial={initial}
            onCancel={onClose}
            onSent={() => {
              onCreated();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
