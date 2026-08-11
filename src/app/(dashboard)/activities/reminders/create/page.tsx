// import { CreateReminderForm } from "@/components/activities/reminders/CreateReminderForm";

// interface CreateReminderPageProps {
//   searchParams: Promise<{ layoutid?: string; redirect?: string }>;
// }

// export default async function CreateReminderPage({
//   searchParams,
// }: CreateReminderPageProps) {
//   const params = await searchParams;
//   const layoutId = params.layoutid ?? "standard";
//   const redirect = params.redirect === "true";

//   return <CreateReminderForm layoutId={layoutId} redirect={redirect} />;
// }

"use client";

import React, { useState } from "react";
import { NotificationMethod } from "@/lib/reminders/types";
import { ReminderHeader } from "@/components/activities/reminders/create/RemainderHeader";
import { ReminderDetailsCard } from "@/components/activities/reminders/create/RemainderDetailsCard";
import { ContextualLinkingCard } from "@/components/activities/reminders/create/ContextualLinkingCard";
import { ReminderSettingsSidebar } from "@/components/activities/reminders/create/RemainderSettingsSidebar";

interface Assignee {
  id: string;
  name: string;
}

export default function CreateReminderPage() {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedEntity, setSelectedEntity] = useState<
    "Lead" | "Contact" | "Company" | "Deal"
  >("Lead");
  const [searchRecord, setSearchRecord] = useState("");

  const [notificationMethod, setNotificationMethod] =
    useState<NotificationMethod>("In-app");
  const [frequency, setFrequency] = useState("Does not repeat");
  const [leadTime, setLeadTime] = useState("15 minutes before");

  const [assignees, setAssignees] = useState<Assignee[]>([
    { id: "u1", name: "Alex Sterling" },
  ]);

  const handleRemoveAssignee = (id: string) => {
    setAssignees(assignees.filter((a) => a.id !== id));
  };

  const handleAddAssignee = (assignee: Assignee) => {
    if (assignees.some((a) => a.id === assignee.id)) return;
    setAssignees([...assignees, assignee]);
  };

  return (
    <div className="w-full mx-auto px-4 py-2 space-y-4 bg-background text-foreground min-h-screen">
      <ReminderHeader
        onCancel={() => console.log("Cancelled reminder creation")}
        onSave={() => console.log("Reminder saved")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <ReminderDetailsCard
            subject={subject}
            onSubjectChange={setSubject}
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
            notes={notes}
            onNotesChange={setNotes}
          />

          <ContextualLinkingCard
            selectedEntity={selectedEntity}
            onSelectEntity={setSelectedEntity}
            searchRecord={searchRecord}
            onSearchRecordChange={setSearchRecord}
          />
        </div>

        {/* Sidebar Column */}
        <div>
          <ReminderSettingsSidebar
            notificationMethod={notificationMethod}
            onNotificationMethodChange={setNotificationMethod}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            leadTime={leadTime}
            onLeadTimeChange={setLeadTime}
            assignees={assignees}
            onRemoveAssignee={handleRemoveAssignee}
            onAddAssignee={handleAddAssignee}
          />
        </div>
      </div>
    </div>
  );
}
