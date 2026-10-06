"use client";

import { useEffect } from "react";
import ScheduleMeetingPage, {
  type ScheduleMeetingSeed,
} from "@/app/(dashboard)/activities/meetings/create/page";

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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 md:pl-56"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
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
