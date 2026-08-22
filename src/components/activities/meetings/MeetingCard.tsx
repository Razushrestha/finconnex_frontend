"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Link2,
} from "lucide-react";
import type { Meeting, MeetingType } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";
import { RelatedToLink } from "@/components/activities/RelatedToLink";

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
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

export function MeetingCard({
  meeting,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
  isSelected = false,
  onSelect,
}: MeetingCardProps) {
  const router = useRouter();
  const wasDragging = useRef(false);
  const TypeIcon = TYPE_ICON[meeting.type];
  const href = `/activities/meetings/detail/${meeting.id}`;

  function goToMeeting() {
    if (wasDragging.current) return;
    router.push(href);
  }

  return (
    <div
      draggable
      role="link"
      tabIndex={0}
      onDragStart={(e) => {
        wasDragging.current = true;
        onDragStart(e);
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          wasDragging.current = false;
        }, 0);
      }}
      onClick={goToMeeting}
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
    </div>
  );
}
