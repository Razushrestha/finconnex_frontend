// import { CreateMeetingForm } from "@/components/activities/meetings/CreateMeetingForm";
// import { asRelatedKind } from "@/lib/activities/create-defaults";

// interface PageProps {
//   searchParams: Promise<{
//     layoutid?: string;
//     redirect?: string;
//     relatedKind?: string;
//     relatedName?: string;
//   }>;
// }

// export default async function CreateMeetingPage({ searchParams }: PageProps) {
//   const params = await searchParams;
//   return (
//     <CreateMeetingForm
//       layoutId={params.layoutid ?? "standard"}
//       redirect={params.redirect === "true"}
//       defaults={{
//         relatedKind: asRelatedKind(params.relatedKind),
//         relatedName: params.relatedName,
//       }}
//     />
//   );
// }

"use client";

import React, { useState } from "react";
import { MeetingHeader } from "@/components/activities/meetings/create/MeetingHeader";
import { MeetingType, Attendee } from "@/lib/meetings/types";
import { MeetingFormCard } from "@/components/activities/meetings/create/MeetingFormCard";
import { AvailabilityCard } from "@/components/activities/meetings/create/AvailabilityCard";
import { PreparationTasksCard } from "@/components/activities/meetings/create/PreparationTasksCard";

export default function ScheduleMeetingPage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("Oct 24, 2023");
  const [time, setTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("45 min");
  const [meetingType, setMeetingType] = useState<MeetingType>("Video Call");
  const [meetingLink, setMeetingLink] = useState("https://zoom.us/j/987654321");
  const [agenda, setAgenda] = useState("");

  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: "u1", name: "Sarah Jenkins", email: "sarah@example.com" },
    { id: "u2", name: "Michael Torres", email: "michael@example.com" },
  ]);

  const handleRemoveAttendee = (id: string) => {
    setAttendees(attendees.filter((a) => a.id !== id));
  };

  const handleAddAttendee = (attendee: Attendee) => {
    if (attendees.some((a) => a.id === attendee.id)) return;
    setAttendees([...attendees, attendee]);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[1920px] space-y-4 bg-background px-4 py-3 text-foreground sm:px-6 2xl:px-8">
      <MeetingHeader
        onCancel={() => console.log("Cancelled scheduling")}
        onSendInvites={() => console.log("Invites sent")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6">
        {/* Left / Main Column */}
        <div>
          <MeetingFormCard
            title={title}
            onTitleChange={setTitle}
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
            duration={duration}
            onDurationChange={setDuration}
            meetingType={meetingType}
            onMeetingTypeChange={setMeetingType}
            meetingLink={meetingLink}
            onMeetingLinkChange={setMeetingLink}
            attendees={attendees}
            onRemoveAttendee={handleRemoveAttendee}
            onAddAttendee={handleAddAttendee}
            agenda={agenda}
            onAgendaChange={setAgenda}
          />
        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          <AvailabilityCard />
          <PreparationTasksCard />
        </div>
      </div>
    </div>
  );
}
