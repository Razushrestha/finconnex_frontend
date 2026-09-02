import { isUuid } from "@/lib/activity-timeline/auth";
import { listAttachments, saveAttachments } from "@/lib/attachments/store";
import { listRelatedCrmCalls, tryCrm as tryCrmCall } from "@/lib/calls/api";
import { mergeCrmCalls } from "@/lib/calls/store";
import { listCrmDocuments, tryCrmDocument } from "@/lib/documents/library/api";
import {
  listCrmDocumentRequests,
  tryCrmDocumentRequest,
} from "@/lib/documents/requests/api";
import { upsertDocumentRequest } from "@/lib/documents/requests/types";
import { listRelatedCrmEmails, persistRemoteEmail, tryCrmEmail } from "@/lib/emails/api";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import {
  listRelatedCrmMeetings,
  persistRemoteMeeting,
  tryCrmMeeting,
} from "@/lib/meetings/api";
import {
  listRelatedCrmNotes,
  persistRemoteNote,
  tryCrmNote,
} from "@/lib/notes/api";
import { listCrmTasks, persistRemoteTask, tryCrmTask } from "@/lib/tasks/api";

function leadRelated(name: string) {
  return `Lead: ${name}`;
}

export async function hydrateCrmLeadRelated(
  id: string,
  leadName: string,
): Promise<void> {
  if (!isUuid(id) || !leadName.trim()) return;
  const related = leadRelated(leadName);

  const [notes, tasks, calls, meetings, emails, docs, requests] =
    await Promise.all([
      tryCrmNote(() => listRelatedCrmNotes("LEAD", id)),
      tryCrmTask(() =>
        listCrmTasks({ relatedType: "LEAD", relatedId: id, limit: 50 }),
      ),
      tryCrmCall(() => listRelatedCrmCalls("LEAD", id)),
      tryCrmMeeting(() => listRelatedCrmMeetings("LEAD", id)),
      tryCrmEmail(() => listRelatedCrmEmails("LEAD", id)),
      tryCrmDocument(() => listCrmDocuments({ leadId: id, limit: 50 })),
      tryCrmDocumentRequest(() =>
        listCrmDocumentRequests({ leadId: id, limit: 50 }),
      ),
    ]);

  for (const note of notes ?? []) {
    persistRemoteNote({
      ...note,
      relatedTo: note.relatedTo?.trim() || related,
      relatedType: note.relatedType || "LEAD",
      relatedId: note.relatedId || id,
    });
  }

  for (const task of tasks ?? []) {
    persistRemoteTask({
      ...task,
      relatedTo: { kind: "Lead", name: leadName },
    });
  }

  if (calls?.length) {
    mergeCrmCalls(
      calls.map((call) => ({
        ...call,
        relatedTo: call.relatedTo?.trim() || related,
      })),
    );
  }

  for (const meeting of meetings ?? []) {
    persistRemoteMeeting({
      ...meeting,
      relatedTo: meeting.relatedTo?.trim() || related,
    });
  }

  for (const email of emails ?? []) {
    persistRemoteEmail({
      ...email,
      relatedTo: email.relatedTo?.trim() || related,
    });
  }

  if (docs?.length) {
    const mapped = docs.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      kind: "Document" as const,
      relatedTo: doc.relatedTo?.trim() || related,
      uploadedBy: doc.owner || "CRM",
      uploadedAt: doc.uploadedAt,
      notes: doc.folder,
      sizeLabel: doc.sizeLabel,
      storageUrl: doc.storageUrl,
    }));
    const keep = listAttachments().filter(
      (row) => !mapped.some((doc) => doc.id === row.id),
    );
    saveAttachments([...mapped, ...keep]);
  }

  for (const req of requests ?? []) {
    upsertDocumentRequest({
      ...req,
      relatedTo: req.relatedTo?.trim() || related,
      clientName: req.clientName || leadName,
    });
  }

  emitLeadActivityChange();
}
