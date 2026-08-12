import React from "react";
import { Calendar, Clock, Edit3, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Meeting, meetings } from "@/lib/meetings/types";
import { MeetingInfoCard } from "@/components/activities/meetings/detail/MeetingInfoCard";
import { MeetingAgenda } from "@/components/activities/meetings/detail/MeetingAgenda";
import { MeetingParticipants } from "@/components/activities/meetings/detail/MeetingParticipants";
import { MeetingNotes } from "@/components/activities/meetings/detail/MeetingNotes";
import { MeetingSidebarCard } from "@/components/activities/meetings/detail/MeetingSidebarCard";

export default async function MeetingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting: Meeting = meetings.find((m) => m.id === id) || meetings[0];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col border-r border-border overflow-y-auto">
        {/* Top Header / Actions Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b border-border bg-card/80 backdrop-blur-md">
          <Link
            href="/activities/meetings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Meetings
          </Link>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
              <Edit3 className="w-4 h-4" /> Edit Details
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Video className="w-4 h-4" /> Join Meeting
            </button>
          </div>
        </div>

        {/* Meeting Header Metadata */}
        <div className="px-8 py-6 space-y-4 border-b border-border bg-card/20">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
              {meeting.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Starts in 2h 15m
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            {meeting.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{meeting.startDateTime.split(" ")[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>
                {meeting.startDateTime.split(" ")[1]}{" "}
                {meeting.startDateTime.split(" ")[2]} -{" "}
                {meeting.endDateTime.split(" ")[1]}{" "}
                {meeting.endDateTime.split(" ")[2]}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-8 space-y-8 flex-1">
          <MeetingInfoCard
            type={meeting.type}
            location={meeting.location}
            meetingLink={meeting.meetingLink}
          />

          <MeetingAgenda agenda={meeting.agenda} />

          <MeetingParticipants
            attendees={meeting.attendees}
            organizer={meeting.organizer}
          />

          <MeetingNotes initialNotes={meeting.notes} />
        </div>
      </div>

      {/* Right CRM Sidebar */}
      <div className="w-96 bg-card/30 p-6 overflow-y-auto border-l border-border hidden xl:block">
        <MeetingSidebarCard relatedTo={meeting.relatedTo} />
      </div>
    </div>
  );
}
