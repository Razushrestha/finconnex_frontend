import {
  Home,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Clock,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "./card-primitives";

export function DashboardBreadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <Home className="h-4 w-4" />
      <span>Home</span>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-gray-600">Dashboard</span>
    </div>
  );
}

const orderByTimeHours = ["4pm", "2pm", "12pm", "10am", "8am"];
const orderByTimeDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const orderByTimeGrid = [
  [0.5, 0.55, 0.6, 0.55, 0.5, 0.45, 0.5],
  [0.4, 0.45, 0.5, 0.75, 0.7, 0.4, 0.45],
  [0.55, 0.6, 0.65, 1, 0.6, 0.55, 0.6],
  [0.45, 0.5, 0.55, 0.7, 0.5, 0.45, 0.5],
  [0.15, 0.2, 0.2, 0.25, 0.2, 0.15, 0.2],
];

export function OrderByTimeCard() {
  return (
    <Card>
      <CardHeader title="Order By Time" />
      <div className="flex flex-col gap-2">
        {orderByTimeHours.map((hour, rowIdx) => (
          <div key={hour} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-gray-400">{hour}</span>
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {orderByTimeDays.map((day, colIdx) => (
                <div
                  key={day}
                  className="aspect-square rounded-md bg-violet-600"
                  style={{ opacity: orderByTimeGrid[rowIdx][colIdx] }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {orderByTimeDays.map((day) => (
              <span key={day} className="text-center text-xs text-gray-400">
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

const meetings = [
  {
    title: "Team Stand Up",
    tag: "Marketing",
    time: "06:00 - 07:00",
    faded: false,
  },
  {
    title: "All Hands Meeting",
    tag: "Manager",
    time: "06:00 - 07:00",
    faded: false,
  },
  {
    title: "Sprint Planning",
    tag: "Design",
    time: "06:00 - 07:00",
    faded: true,
  },
];

export function UpcomingMeetingsCard() {
  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[15px] font-semibold leading-snug text-gray-900">
          Upcoming
          <br />
          Meetings
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Add meeting"
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="relative -mx-5 max-h-[300px] overflow-hidden px-5">
        <div className="flex flex-col gap-3">
          {meetings.map((m) => (
            <div
              key={m.title}
              className={cn(
                "rounded-xl bg-gray-50 p-4 transition-opacity",
                m.faded && "opacity-40",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  {m.title}
                </h4>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                <Video className="h-3.5 w-3.5 text-emerald-500" />
                On Google Meet
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  {m.tag}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {m.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
    </Card>
  );
}
