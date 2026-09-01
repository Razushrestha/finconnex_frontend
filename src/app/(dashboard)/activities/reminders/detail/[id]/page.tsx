"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Clock, Link2, User } from "lucide-react";
import { ActivityTimelineButton } from "@/components/activities/ActivityTimelineButton";
import { reminders } from "@/lib/reminders/types";
import { useModuleBack } from "@/hooks/useModuleBack";
import { PAGE_FRAME } from "@/lib/layout";

export default function ReminderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const back = useModuleBack("/activities/reminders", "Back to Reminders");
  const reminder = reminders.find((item) => item.id === id) ?? null;

  if (!reminder) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Reminder not found
          </p>
          <Link
            href={back.href}
            className="mt-3 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {back.label}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${PAGE_FRAME} min-h-full bg-white`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
        <ActivityTimelineButton
          href={`/activities/reminders/detail/${reminder.id}/timeline`}
        />
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700">
            <Bell className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {reminder.status}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {reminder.title}
        </h1>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              When
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-800">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {reminder.dateTime}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Type
            </dt>
            <dd className="mt-1 text-[13px] text-slate-800">{reminder.type}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Owner
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {reminder.owner}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Notify
            </dt>
            <dd className="mt-1 text-[13px] text-slate-800">
              {reminder.notificationMethod}
            </dd>
          </div>
          {reminder.relatedTo ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Related to
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-800">
                <Link2 className="h-3.5 w-3.5 text-slate-400" />
                {reminder.relatedTo}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
