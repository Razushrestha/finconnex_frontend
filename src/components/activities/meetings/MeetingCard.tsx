import { Calendar, Clock, MapPin } from "lucide-react";
import type { Meeting } from "@/lib/meetings/types";

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
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-meeting-id={meeting.id}
      data-column-id={columnId}
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5" />
        {meeting.relatedTo ?? "General Meeting"}
      </div>

      <h4 className="mb-1.5 truncate text-sm font-semibold text-slate-900">
        {meeting.title}
      </h4>

      <p className="mb-1 truncate text-xs text-slate-500">
        Host: {meeting.organizer}
      </p>
      {meeting.location && (
        <p className="mb-3 flex items-center gap-1 truncate text-xs text-slate-400">
          <MapPin className="h-3 w-3" /> {meeting.location}
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        <span>{meeting.startDateTime}</span>
      </div>
    </div>
  );
}
