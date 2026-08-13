/** CSV export helpers for activity modules (SRS §4.2–4.8). */

import { Download } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/import/csv";
import { listCalls } from "@/lib/calls/store";
import { listEmails } from "@/lib/emails/store";
import { listMessages } from "@/lib/messages/store";
import { listMeetings } from "@/lib/meetings/store";
import { reminderColumns } from "@/lib/reminders/types";
import type { MoreMenuItem } from "@/components/activities/ActivityToolbar";

export function exportCallsCsv(): number {
  const rows = listCalls();
  downloadCsv(
    `calls-${Date.now()}.csv`,
    toCsv(
      [
        "ID",
        "Subject",
        "Type",
        "Status",
        "Date",
        "Contact",
        "Related To",
        "Assigned To",
        "Duration",
      ],
      rows.map((c) => [
        c.id,
        c.subject,
        c.callType,
        c.status,
        c.date,
        c.contact ?? "",
        c.relatedTo ?? "",
        c.assignedTo,
        c.duration ?? "",
      ]),
    ),
  );
  return rows.length;
}

export function exportEmailsCsv(): number {
  const rows = listEmails();
  downloadCsv(
    `emails-${Date.now()}.csv`,
    toCsv(
      ["ID", "Subject", "From", "To", "Status", "Related To", "Sent", "Opened"],
      rows.map((e) => [
        e.id,
        e.subject,
        e.from,
        e.to.join("; "),
        e.status,
        e.relatedTo ?? "",
        e.sentDate ?? "",
        e.openedDate ?? "",
      ]),
    ),
  );
  return rows.length;
}

export function exportMessagesCsv(): number {
  const rows = listMessages();
  downloadCsv(
    `messages-${Date.now()}.csv`,
    toCsv(
      ["ID", "Type", "Subject", "From", "To", "Status", "Related To", "Sent"],
      rows.map((m) => [
        m.id,
        m.type,
        m.subject,
        m.from,
        m.to,
        m.status,
        m.relatedTo ?? "",
        m.sentDate ?? "",
      ]),
    ),
  );
  return rows.length;
}

export function exportMeetingsCsv(): number {
  const rows = listMeetings();
  downloadCsv(
    `meetings-${Date.now()}.csv`,
    toCsv(
      [
        "ID",
        "Title",
        "Type",
        "Status",
        "Start",
        "End",
        "Organizer",
        "Related To",
        "Location",
      ],
      rows.map((m) => [
        m.id,
        m.title,
        m.type,
        m.status,
        m.startDateTime,
        m.endDateTime,
        m.organizer,
        m.relatedTo ?? "",
        m.location ?? "",
      ]),
    ),
  );
  return rows.length;
}

export function exportRemindersCsv(): number {
  const rows = reminderColumns.flatMap((c) => c.reminders);
  downloadCsv(
    `reminders-${Date.now()}.csv`,
    toCsv(
      ["ID", "Title", "Type", "Status", "Date/Time", "Method", "Owner", "Related To"],
      rows.map((r) => [
        r.id,
        r.title,
        r.type,
        r.status,
        r.dateTime,
        r.notificationMethod,
        r.owner,
        r.relatedTo ?? "",
      ]),
    ),
  );
  return rows.length;
}

export function activityExportMenuItem(
  kind: "calls" | "emails" | "messages" | "meetings" | "reminders",
): MoreMenuItem {
  const runners = {
    calls: exportCallsCsv,
    emails: exportEmailsCsv,
    messages: exportMessagesCsv,
    meetings: exportMeetingsCsv,
    reminders: exportRemindersCsv,
  } as const;
  const labels = {
    calls: "Export Calls",
    emails: "Export Emails",
    messages: "Export Messages",
    meetings: "Export Meetings",
    reminders: "Export Reminders",
  } as const;
  return {
    key: `export-${kind}`,
    icon: Download,
    label: labels[kind],
    onSelect: () => runners[kind](),
  };
}
