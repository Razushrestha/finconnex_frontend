"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createReminderScheduleEntry,
  type NotificationMethod,
  type ReminderScheduleEntry,
} from "@/lib/reminders/types";
import { ReminderHeader } from "@/components/activities/reminders/create/RemainderHeader";
import { ReminderDetailsCard } from "@/components/activities/reminders/create/RemainderDetailsCard";
import { ReminderSchedulesCard } from "@/components/activities/reminders/create/ReminderSchedulesCard";
import { ContextualLinkingCard } from "@/components/activities/reminders/create/ContextualLinkingCard";
import { ReminderSettingsSidebar } from "@/components/activities/reminders/create/RemainderSettingsSidebar";

interface Assignee {
  id: string;
  name: string;
}

export default function CreateReminderPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduleEntries, setScheduleEntries] = useState<ReminderScheduleEntry[]>(
    [createReminderScheduleEntry("Web Push")],
  );

  const [selectedEntity, setSelectedEntity] = useState<
    "Lead" | "Contact" | "Company" | "Deal"
  >("Lead");
  const [searchRecord, setSearchRecord] = useState("");

  const [notificationMethod, setNotificationMethod] =
    useState<NotificationMethod>("Web Push");
  const [frequency, setFrequency] = useState("Does not repeat");
  const [leadTime, setLeadTime] = useState("15 minutes before");

  const [assignees, setAssignees] = useState<Assignee[]>([
    { id: "u1", name: "Alex Sterling" },
  ]);

  function handleRemoveAssignee(id: string) {
    setAssignees((prev) => prev.filter((a) => a.id !== id));
  }

  function handleAddAssignee(assignee: Assignee) {
    setAssignees((prev) =>
      prev.some((a) => a.id === assignee.id) ? prev : [...prev, assignee],
    );
  }

  function handleNotificationMethodChange(method: NotificationMethod) {
    setNotificationMethod(method);
    setScheduleEntries((prev) =>
      prev.map((entry) => ({ ...entry, notificationMethod: method })),
    );
  }

  function handleSave() {
    if (!subject.trim()) return;
    const validEntries = scheduleEntries.filter(
      (entry) => entry.date && entry.time,
    );
    if (validEntries.length === 0) return;

    console.log("Saving reminders", {
      subject,
      notes,
      selectedEntity,
      searchRecord,
      frequency,
      leadTime,
      assignees,
      scheduleEntries: validEntries,
    });
    router.push("/activities/reminders");
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1920px] space-y-4 bg-background px-4 py-3 text-foreground sm:px-6 2xl:px-8">
      <ReminderHeader
        onCancel={() => router.push("/activities/reminders")}
        onSave={handleSave}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6">
        <div className="space-y-4">
          <ReminderDetailsCard
            subject={subject}
            onSubjectChange={setSubject}
            notes={notes}
            onNotesChange={setNotes}
          />

          <ReminderSchedulesCard
            entries={scheduleEntries}
            onChange={setScheduleEntries}
            defaultNotificationMethod={notificationMethod}
          />

          <ContextualLinkingCard
            selectedEntity={selectedEntity}
            onSelectEntity={setSelectedEntity}
            searchRecord={searchRecord}
            onSearchRecordChange={setSearchRecord}
          />
        </div>

        <div>
          <ReminderSettingsSidebar
            notificationMethod={notificationMethod}
            onNotificationMethodChange={handleNotificationMethodChange}
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
