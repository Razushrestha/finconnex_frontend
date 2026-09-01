"use client";

import { use, useEffect, useState } from "react";
import { Calendar, Clock, Edit3, Video, ArrowLeft } from "lucide-react";
import { ActivityTimelineButton } from "@/components/activities/ActivityTimelineButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import type { Meeting } from "@/lib/meetings/types";
import { findMeetingById } from "@/lib/meetings/store";
import { MeetingInfoCard } from "@/components/activities/meetings/detail/MeetingInfoCard";
import { MeetingAgenda } from "@/components/activities/meetings/detail/MeetingAgenda";
import { MeetingParticipants } from "@/components/activities/meetings/detail/MeetingParticipants";
import { MeetingNotes } from "@/components/activities/meetings/detail/MeetingNotes";
import { MeetingSidebarCard } from "@/components/activities/meetings/detail/MeetingSidebarCard";
import { EditMeetingModal } from "@/components/activities/meetings/detail/EditMeetingModal";
import { onRulesChange } from "@/lib/rules";
import { toast } from "sonner";

export default function MeetingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const back = useModuleBack("/activities/meetings", "Back to Meetings");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    function load() {
      setMeeting(findMeetingById(id)?.meeting ?? null);
      setReady(true);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading meeting…</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Meeting not found</p>
          <button
            type="button"
            onClick={() => router.push(back.href)}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {back.label}
          </button>
        </div>
      </div>
    );
  }

  const startParts = meeting.startDateTime.split(" ");
  const endParts = meeting.endDateTime.split(" ");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 flex-col overflow-y-auto border-r border-border">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-8 py-4 backdrop-blur-md">
          <Link
            href={back.href}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {back.label}
          </Link>
          <div className="flex items-center gap-3">
            <ActivityTimelineButton
              href={`/activities/meetings/detail/${meeting.id}/timeline`}
            />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Edit3 className="w-4 h-4" /> Edit Details
            </button>
            <button
              type="button"
              onClick={() => {
                if (meeting.meetingLink) {
                  window.open(meeting.meetingLink, "_blank", "noopener,noreferrer");
                  return;
                }
                toast.error("This meeting has no join link");
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <Video className="w-4 h-4" /> Join Meeting
            </button>
          </div>
        </div>

        <div className="space-y-4 border-b border-border bg-white px-8 py-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              {meeting.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            {meeting.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{startParts[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>
                {startParts[1]} {startParts[2]} - {endParts[1]} {endParts[2]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-8">
          <MeetingInfoCard
            type={meeting.type}
            location={meeting.location}
            meetingLink={meeting.meetingLink}
          />

          <MeetingAgenda agenda={meeting.agenda} />

          <MeetingParticipants
            meeting={meeting}
            onManage={() => setEditing(true)}
          />

          <MeetingNotes initialNotes={meeting.notes} />
        </div>
      </div>

      <div className="hidden w-96 overflow-y-auto border-l border-border bg-white p-6 xl:block">
        <MeetingSidebarCard relatedTo={meeting.relatedTo} />
      </div>

      {editing ? (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setEditing(false)}
          onSaved={setMeeting}
        />
      ) : null}
    </div>
  );
}
