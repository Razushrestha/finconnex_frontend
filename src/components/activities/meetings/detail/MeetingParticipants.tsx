"use client";

import React from "react";
import { Users } from "lucide-react";
import { Attendee } from "@/lib/meetings/types";

interface MeetingParticipantsProps {
  attendees: Attendee[];
  organizer: string;
  onManage?: () => void;
  onRemove?: (id: string) => void;
}

export function MeetingParticipants({
  attendees,
  organizer,
  onManage,
  onRemove,
}: MeetingParticipantsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
            Participants ({attendees.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          Manage
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attendees.map((attendee) => {
          const isOrganizer = attendee.email === organizer;
          const initials = attendee.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={attendee.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white"
            >
              <div className="relative w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {initials}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-medium text-card-foreground truncate">
                    {attendee.name}
                  </h4>
                  {isOrganizer && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground font-medium">
                      Organizer
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {attendee.email}
                </p>
              </div>
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(attendee.id)}
                  className="text-[11px] font-semibold text-rose-600"
                >
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
