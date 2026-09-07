"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createReminderScheduleEntry,
  type NotificationMethod,
  type ReminderScheduleEntry,
} from "@/lib/reminders/types";
import {
  createCrmReminder,
  createRelatedCrmReminder,
  isCrmReminderId,
  persistRemoteReminder,
  reminderDateTimeToIso,
} from "@/lib/reminders/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  defaultAssignableOwnerId,
  loadAssignableOwners,
  resolveCrmAssigneeUserId,
} from "@/lib/users/assignable";
import type { ReminderParentType } from "@/lib/reminders/related";
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
    [createReminderScheduleEntry("In-app")],
  );

  const [selectedEntity, setSelectedEntity] = useState<ReminderParentType | "">(
    "",
  );
  const [searchRecord, setSearchRecord] = useState("");
  const [relatedId, setRelatedId] = useState("");

  const [notificationMethod, setNotificationMethod] =
    useState<NotificationMethod>("In-app");
  const [frequency, setFrequency] = useState("Does not repeat");
  const [leadTime, setLeadTime] = useState("15 minutes before");

  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled) return;
      const id = defaultAssignableOwnerId(rows);
      const match = rows.find((row) => row.id === id);
      if (match) setAssignees([{ id: match.id, name: match.name }]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleSave() {
    if (!subject.trim()) {
      setSaveError("Subject is required");
      return;
    }
    const validEntries = scheduleEntries.filter(
      (entry) => entry.date && entry.time,
    );
    if (validEntries.length === 0) {
      setSaveError("Add at least one reminder date and time");
      return;
    }
    if (selectedEntity && !isUuid(relatedId)) {
      setSaveError("Pick a live Task, Call, or Meeting");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const targetUserId = await resolveCrmAssigneeUserId(assignees[0]?.id);
      if (!targetUserId || !isUuid(targetUserId)) {
        throw new Error("Assign a workspace member");
      }
      let lastId = "";
      for (const entry of validEntries) {
        const remindAt = reminderDateTimeToIso(entry.date, entry.time);
        const payload = {
          title: subject.trim(),
          notes: notes.trim() || undefined,
          remindAt,
          dueAt: remindAt,
          targetUserId,
        };
        const created = persistRemoteReminder(
          selectedEntity && isUuid(relatedId)
            ? await createRelatedCrmReminder(selectedEntity, relatedId, payload)
            : await createCrmReminder(payload),
        );
        if (!created?.id || !isCrmReminderId(created.id)) {
          throw new Error("CRM did not save the reminder");
        }
        lastId = created.id;
      }
      router.push(
        lastId
          ? `/activities/reminders/detail/${lastId}`
          : "/activities/reminders",
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save reminder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1920px] space-y-4 bg-background px-4 py-3 text-foreground sm:px-6 2xl:px-8">
      <ReminderHeader
        onCancel={() => router.push("/activities/reminders")}
        onSave={() => void handleSave()}
        saving={saving}
      />
      {saveError ? (
        <p className="text-[12px] text-rose-600">{saveError}</p>
      ) : null}
      {saving ? (
        <p className="text-[12px] text-slate-500">Saving…</p>
      ) : null}

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
            relatedId={relatedId}
            onRelatedIdChange={setRelatedId}
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
