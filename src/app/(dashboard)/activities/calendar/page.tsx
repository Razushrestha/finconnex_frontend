"use client";

import { ActivitiesCalendarView } from "@/components/activities/calendar/ActivitiesCalendarView";
import { BOARD_PAGE } from "@/lib/layout";

export default function CalendarPage() {
  return (
    <div className={BOARD_PAGE}>
      <div className="mt-0 flex min-h-0 flex-1 items-stretch overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ActivitiesCalendarView />
        </div>
      </div>
    </div>
  );
}
