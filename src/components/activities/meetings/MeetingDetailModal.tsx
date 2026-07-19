"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  Link as LinkIcon,
  User,
  Users,
} from "lucide-react";
import type { Meeting } from "@/lib/meetings/types";

export function MeetingDetailModal({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">{meeting.title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Calendar className="h-4 w-4" />{" "}
            {meeting.startDateTime.split(" ")[0]}
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Clock className="h-4 w-4" /> {meeting.startDateTime.split(" ")[1]}{" "}
            - {meeting.endDateTime.split(" ")[1]}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-xs font-semibold uppercase text-slate-400 mb-1">
              Agenda
            </p>
            <p className="text-slate-700">{meeting.agenda}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
              Attendees
            </p>
            {meeting.attendees.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <User className="h-4 w-4 text-slate-400" /> {a.name}
              </div>
            ))}
          </div>

          <a
            href={meeting.meetingLink}
            target="_blank"
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium pt-2"
          >
            <LinkIcon className="h-4 w-4" /> Join Meeting Link
          </a>
        </div>
      </div>
    </div>
  );
}
