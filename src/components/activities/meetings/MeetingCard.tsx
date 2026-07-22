import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Link2,
} from "lucide-react";
import type { Meeting, MeetingStatus, MeetingType } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

const STATUS_BORDER: Record<MeetingStatus, string> = {
  Scheduled: "border-l-sky-500",
  "In Progress": "border-l-amber-500",
  Completed: "border-l-emerald-500",
  Cancelled: "border-l-slate-400",
  Rescheduled: "border-l-violet-500",
};

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
}

export function MeetingCard({
  meeting,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: MeetingCardProps) {
  const TypeIcon = TYPE_ICON[meeting.type];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-meeting-id={meeting.id}
      data-column-id={columnId}
      className={cn(
        "cursor-grab select-none rounded-xl border border-slate-100 border-l-[3px] bg-white p-3.5 shadow-sm transition-all active:cursor-grabbing",
        STATUS_BORDER[meeting.status],
        isDragging ? "opacity-40" : "hover:border-slate-200 hover:shadow-md",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold leading-snug text-slate-900">
          {meeting.title}
        </h4>
        <TypeIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </div>

      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
        <span className="truncate">
          {meeting.relatedTo ?? "General Meeting"}
        </span>
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

      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            TYPE_SOFT[meeting.type],
          )}
        >
          {meeting.type}
        </span>
        <span className="max-w-[100px] truncate text-[10px] text-slate-400">
          {meeting.organizer.split("@")[0]}
        </span>
      </div>
    </div>
  );
}
