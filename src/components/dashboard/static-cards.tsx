"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, CalendarDays, ArrowUpRight } from "lucide-react";
import { Card, CardHeader } from "./card-primitives";
import { fetchCalendarUpcoming } from "@/lib/calendar/api";
import type { CalendarItem } from "@/lib/calendar/types";

export function DashboardBreadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <span>Dashboard</span>
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

function formatMeetingTime(item: CalendarItem): string {
  const start = item.start.includes("T") ? item.start.split("T")[1]!.slice(0, 5) : "09:00";
  const end = item.end?.includes("T") ? item.end.split("T")[1]!.slice(0, 5) : "";
  return end ? `${start} - ${end}` : start;
}

export function UpcomingMeetingsCard() {
  const [live, setLive] = useState<CalendarItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCalendarUpcoming()
      .then((items) => {
        if (!cancelled) setLive(items);
      })
      .catch(() => {
        if (!cancelled) setLive(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = (live ?? []).slice(0, 5).map((item) => ({
    id: item.id ?? item.title,
    title: item.title,
    tag: item.type,
    time: formatMeetingTime(item),
    day: meetingDay(item.start),
  }));

  return (
    <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)]">
      <header className="flex items-center justify-between gap-2 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold leading-tight text-slate-900">
              Meetings
            </h2>
            <p className="text-[10px] text-slate-500">Coming up on the calendar</p>
          </div>
        </div>
        <Link
          href="/activities/meetings"
          className="text-slate-400 hover:text-violet-700"
          aria-label="Open meetings"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="flex-1 px-3 py-3">
        {!loaded ? (
          <p className="py-10 text-center text-[12px] text-slate-400">
            Loading meetings…
          </p>
        ) : rows.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] font-medium text-slate-600">
              {live === null ? "Calendar not connected" : "No meetings booked"}
            </p>
            <p className="max-w-[200px] text-[11px] text-slate-400">
              Scheduled calls and stand-ups will show here.
            </p>
            <Link
              href="/activities/meetings"
              className="mt-1 text-[11px] font-semibold text-violet-700"
            >
              Open meetings
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-xl bg-slate-50 px-2.5 py-2"
              >
                <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-center ring-1 ring-slate-200">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-sky-600">
                    {m.day.month}
                  </span>
                  <span className="text-sm font-bold leading-none text-slate-900">
                    {m.day.date}
                  </span>
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="truncate text-[12px] font-semibold text-slate-800">
                    {m.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    {m.time}
                    {m.tag ? ` · ${m.tag}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function meetingDay(start: string) {
  const parsed = Date.parse(start);
  const d = Number.isNaN(parsed) ? new Date() : new Date(parsed);
  return {
    month: d.toLocaleString("en-AU", { month: "short" }),
    date: String(d.getDate()),
  };
}
