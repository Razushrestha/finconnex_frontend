"use client";

import { Users } from "lucide-react";
import type { Attendee, Meeting, MeetingAttendeeRole } from "@/lib/meetings/types";
import { resolveAttendeeRole, withResolvedRoles } from "@/lib/meetings/roles";
import { cn } from "@/lib/utils";

const ROLE_STYLE: Record<MeetingAttendeeRole, string> = {
  Host: "bg-[#F3ECFB] text-[#5A32A3]",
  Guest: "bg-slate-100 text-slate-600",
  "Main Applicant": "bg-emerald-50 text-emerald-700",
};

interface MeetingParticipantsProps {
  meeting: Pick<Meeting, "organizer" | "relatedTo" | "attendees">;
  onManage?: () => void;
}

export function MeetingParticipants({
  meeting,
  onManage,
}: MeetingParticipantsProps) {
  const attendees = withResolvedRoles(meeting);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-wider text-card-foreground uppercase">
            Participants ({attendees.length})
          </h3>
        </div>
        {onManage ? (
          <button
            type="button"
            onClick={onManage}
            className="cursor-pointer text-xs font-medium text-primary hover:underline"
          >
            Manage
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attendees.map((attendee) => (
          <ParticipantCard
            key={attendee.id}
            attendee={attendee}
            role={resolveAttendeeRole(attendee, meeting)}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({
  attendee,
  role,
}: {
  attendee: Attendee;
  role: MeetingAttendeeRole;
}) {
  const initials = attendee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {initials}
        <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className="truncate text-sm font-medium text-card-foreground">
            {attendee.name}
          </h4>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
              ROLE_STYLE[role],
            )}
          >
            {role}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {attendee.email}
        </p>
      </div>
    </div>
  );
}
