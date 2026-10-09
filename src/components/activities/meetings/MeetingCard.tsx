"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/notify/toast";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Link2,
  RotateCcw,
  UserPlus,
  FileText,
} from "lucide-react";
import type { Meeting, MeetingType } from "@/lib/meetings/types";
import { isMeetingOverdue, updateMeeting } from "@/lib/meetings/store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { getRulesActor } from "@/lib/rules/actor";
import { cn } from "@/lib/utils";
import {
  cardDragging,
  cardMotion,
  cardSubject,
  entityCardBox,
} from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { RelatedToLink } from "@/components/activities/RelatedToLink";
import { WorkQueueNotesDrawer } from "@/components/work-queue/WorkQueueNotesDrawer";
import { RescheduleMeetingModal } from "@/components/activities/meetings/RescheduleMeetingModal";
import { ManageAttendeesModal } from "@/components/activities/meetings/ManageAttendeesModal";

const TYPE_ICON: Record<MeetingType, React.ElementType> = {
  "Video Call": Video,
  "Phone Call": Phone,
  Conference: Users,
  "In-person": MapPin,
};

const TYPE_SOFT: Record<MeetingType, string> = {
  "Video Call": "bg-violet-50 text-violet-700",
  "Phone Call": "bg-sky-50 text-sky-700",
  Conference: "bg-amber-50 text-amber-800",
  "In-person": "bg-emerald-50 text-emerald-700",
};

interface MeetingCardProps {
  meeting: Meeting;
  columnId: string;
  onDragPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragClickCapture?: (e: React.MouseEvent) => void;
  isDragging: boolean;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

export function MeetingCard({
  meeting,
  columnId,
  onDragPointerDown,
  onDragClickCapture,
  isDragging,
  isSelected = false,
  onSelect,
}: MeetingCardProps) {
  const router = useRouter();
  const wasDragging = useRef(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const TypeIcon = TYPE_ICON[meeting.type];
  const href = `/activities/meetings/detail/${meeting.id}`;
  const [showReschedule, setShowReschedule] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  function goToMeeting() {
    if (wasDragging.current) return;
    router.push(href);
  }

  function joinMeeting(e: React.MouseEvent) {
    e.stopPropagation();
    const link = meeting.meetingLink?.trim();
    if (!link) {
      toast.error("No meeting link has been added.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");

    // Optional: Scheduled → In Progress only once the meeting start time has passed.
    if (meeting.status === "Scheduled") {
      const start = parseTaskDueDate(meeting.startDateTime);
      const started =
        (start && start.getTime() <= Date.now()) || isMeetingOverdue(meeting);
      if (started) {
        updateMeeting(meeting.id, { status: "In Progress" });
        toast.message("Meeting moved to In Progress");
      }
    }
  }

  function openReschedule(e: React.MouseEvent) {
    e.stopPropagation();
    setShowReschedule(true);
  }

  function openAttendees(e: React.MouseEvent) {
    e.stopPropagation();
    setShowAttendees(true);
  }

  function openNotes(e: React.MouseEvent) {
    e.stopPropagation();
    setShowNotes(true);
  }

  return (
    <>
      <div
        // The board drags cards with pointer events, not the browser's
        // drag and drop; the footer's buttons must not start a drag.
        draggable={false}
        onPointerDown={(e) => {
          if (footerRef.current?.contains(e.target as Node)) return;
          onDragPointerDown(e);
        }}
        onClickCapture={onDragClickCapture}
        onDragStart={(e) => e.preventDefault()}
        role="link"
        tabIndex={0}
        onClick={(e) => {
          if (
            footerRef.current &&
            footerRef.current.contains(e.target as Node)
          ) {
            return;
          }
          goToMeeting();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToMeeting();
          }
        }}
        data-focus-id={meeting.id}
        data-meeting-id={meeting.id}
        data-column-id={columnId}
        className={cn(
          entityCardBox,
          "group/card cursor-pointer",
          cardMotion,
          isDragging && cardDragging,
          isSelected
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "hover:border-slate-300",
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4
            className={cn(
              "text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-100",
              cardSubject,
            )}
          >
            {meeting.title}
          </h4>
          <div className="flex shrink-0 items-center gap-1.5">
            <TypeIcon className="h-3.5 w-3.5 text-slate-400" />
            {onSelect ? (
              <div
                className={cn(
                  "shrink-0 transition-opacity",
                  isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover/card:opacity-100",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select meeting ${meeting.title}`}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
          {meeting.relatedTo ? (
            <RelatedToLink relatedTo={meeting.relatedTo} />
          ) : (
            <span className="truncate">General Meeting</span>
          )}
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{meeting.startDateTime}</span>
          </div>
          {meeting.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{meeting.location}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">
                {meeting.attendees.length} attendee
                {meeting.attendees.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-50 pt-2.5">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
              TYPE_SOFT[meeting.type],
            )}
          >
            {meeting.type}
          </span>
          <CardOwnerRow name={meeting.organizer} />
        </div>

        <div
          ref={footerRef}
          className="mt-3 grid grid-cols-4 gap-1 border-t border-slate-100 pt-2"
        >
          <button
            type="button"
            onClick={joinMeeting}
            title="Join Meeting"
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="text-[9px] font-medium leading-none">Join</span>
          </button>
          <button
            type="button"
            onClick={openReschedule}
            title="Reschedule"
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-[9px] font-medium leading-none">
              Reschedule
            </span>
          </button>
          <button
            type="button"
            onClick={openAttendees}
            title="Manage Attendees"
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="text-[9px] font-medium leading-none">
              Attendees
            </span>
          </button>
          <button
            type="button"
            onClick={openNotes}
            title="Add Note"
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="text-[9px] font-medium leading-none">
              Add Note
            </span>
          </button>
        </div>
      </div>

      {showReschedule ? (
        <RescheduleMeetingModal
          meeting={meeting}
          onClose={() => setShowReschedule(false)}
        />
      ) : null}

      {showAttendees ? (
        <ManageAttendeesModal
          meeting={meeting}
          onClose={() => setShowAttendees(false)}
        />
      ) : null}

      {showNotes ? (
        <WorkQueueNotesDrawer
          row={{
            id: meeting.id,
            subject: meeting.title,
            related: meeting.relatedTo,
            href,
          }}
          onClose={() => setShowNotes(false)}
          onChanged={(message) => {
            const actor = getRulesActor().name || "User";
            toast.success(message || `Note added by ${actor}`);
          }}
        />
      ) : null}
    </>
  );
}
