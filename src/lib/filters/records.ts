import { listActiveCustomFieldsForEntity } from "@/lib/custom-fields/store";
import type { Call } from "@/lib/calls/types";
import type { CompanyCardData } from "@/lib/companies/types";
import type { ContactCardData } from "@/lib/contacts/types";
import type { DealRecord } from "@/lib/deals/types";
import type { Email } from "@/lib/emails/types";
import {
  CALL_FILTER_FIELDS,
  COMPANY_FILTER_FIELDS,
  CONTACT_FILTER_FIELDS,
  EMAIL_FILTER_FIELDS,
  MEETING_FILTER_FIELDS,
  MESSAGE_FILTER_FIELDS,
  NOTE_FILTER_FIELDS,
  REMINDER_FILTER_FIELDS,
  TASK_FILTER_FIELDS,
  WEBSITE_ACTIVITY_FIELDS,
  contactFilterFields,
  dealFilterFields,
  leadFilterFields,
} from "@/lib/filters/catalogs";
import { matchesFieldClauses, matchesSystemDefined } from "@/lib/filters/match";
import type {
  CallFilters,
  CompanyFilters,
  ContactFilters,
  DealFilters,
  LeadFilters,
  MailListFilters,
  MeetingFilters,
  MessageFilters,
  NoteFilters,
} from "@/lib/filters/module-filters";
import {
  getCallFieldValue,
  getCompanyFieldValue,
  getContactFieldValue,
  getDealFieldValue,
  getEmailFieldValue,
  getLeadFieldValue,
  getMeetingFieldValue,
  getMessageFieldValue,
  getNoteFieldValue,
  getReminderFieldValue,
  getTaskFieldValue,
} from "@/lib/filters/values";
import type { LeadCardData } from "@/lib/leads/types";
import type { Meeting } from "@/lib/meetings/types";
import type { Message } from "@/lib/messages/types";
import type { Note } from "@/lib/notes/types";
import type { Reminder, ReminderFilters } from "@/lib/reminders/types";
import type { Task, TaskFilters } from "@/lib/tasks/types";

type LeadLike = LeadCardData & { statusTitle?: string; stageTitle?: string };

export function leadMatchesFilters(card: LeadLike, filters?: LeadFilters) {
  if (!filters) return true;
  if (filters.sources?.length && !filters.sources.includes(card.source)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, card)) return false;
  const fields = [
    ...leadFilterFields(listActiveCustomFieldsForEntity("Lead")),
    ...WEBSITE_ACTIVITY_FIELDS,
  ];
  return matchesFieldClauses(
    filters.clauses,
    (id) => getLeadFieldValue(card, id),
    fields,
  );
}

export function dealMatchesFilters(
  deal: DealRecord & { stageTitle?: string; lostReason?: string },
  filters?: DealFilters,
) {
  if (!filters) return true;
  if (filters.stages.length && deal.stageTitle && !filters.stages.includes(deal.stageTitle)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, {})) return false;
  return matchesFieldClauses(
    filters.clauses,
    (id) => getDealFieldValue(deal, id),
    dealFilterFields(listActiveCustomFieldsForEntity("Deal")),
  );
}

export function contactMatchesFilters(
  contact: ContactCardData & { statusTitle?: string },
  filters?: ContactFilters,
) {
  if (!filters) return true;
  if (filters.sources.length && !filters.sources.includes(contact.source)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, { createdDate: contact.createdDate })) {
    return false;
  }
  return matchesFieldClauses(
    filters.clauses,
    (id) => getContactFieldValue(contact, id),
    [...contactFilterFields(listActiveCustomFieldsForEntity("Contact")), ...WEBSITE_ACTIVITY_FIELDS],
  );
}

export function companyMatchesFilters(
  company: CompanyCardData & { statusTitle?: string },
  filters?: CompanyFilters,
) {
  if (!filters) return true;
  if (!matchesSystemDefined(filters.systemDefined, {})) return false;
  return matchesFieldClauses(
    filters.clauses,
    (id) => getCompanyFieldValue(company, id),
    COMPANY_FILTER_FIELDS,
  );
}

export function taskMatchesDeepFilters(task: Task, filters?: TaskFilters) {
  if (!filters) return true;
  if (!matchesSystemDefined(filters.systemDefined, {
    createdDate: task.createdOn,
    modifiedDate: task.modifiedOn,
  })) {
    return false;
  }
  return matchesFieldClauses(
    filters.clauses,
    (id) => getTaskFieldValue(task, id),
    TASK_FILTER_FIELDS,
  );
}

export function callMatchesFilters(call: Call, filters?: CallFilters) {
  if (!filters) return true;
  if (filters.statuses.length && !filters.statuses.includes(call.status as CallFilters["statuses"][number])) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(call.callType)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, {
    createdDate: call.createdOn,
    modifiedDate: call.modifiedOn,
  })) {
    return false;
  }
  return matchesFieldClauses(
    filters.clauses,
    (id) => getCallFieldValue(call, id),
    CALL_FILTER_FIELDS,
  );
}

export function meetingMatchesFilters(meeting: Meeting, filters?: MeetingFilters) {
  if (!filters) return true;
  if (filters.statuses.length && !filters.statuses.includes(meeting.status)) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(meeting.type)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, {})) return false;
  return matchesFieldClauses(
    filters.clauses,
    (id) => getMeetingFieldValue(meeting, id),
    MEETING_FILTER_FIELDS,
  );
}

export function noteMatchesFilters(note: Note, filters?: NoteFilters) {
  if (!filters) return true;
  if (filters.types.length && !filters.types.includes(note.noteType)) return false;
  if (filters.flags.includes("Pinned") && !note.isPinned) return false;
  if (filters.flags.includes("Private") && !note.isPrivate) return false;
  if (!matchesSystemDefined(filters.systemDefined, {
    createdDate: note.createdAt,
    modifiedDate: note.updatedAt,
  })) {
    return false;
  }
  return matchesFieldClauses(
    filters.clauses,
    (id) => getNoteFieldValue(note, id),
    NOTE_FILTER_FIELDS,
  );
}

export function messageMatchesFilters(message: Message, filters?: MessageFilters) {
  if (!filters) return true;
  if (filters.types.length && !filters.types.includes(message.type)) return false;
  if (filters.statuses.length && !filters.statuses.includes(message.status)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, {})) return false;
  return matchesFieldClauses(
    filters.clauses,
    (id) => getMessageFieldValue(message, id),
    MESSAGE_FILTER_FIELDS,
  );
}

export function emailMatchesFilters(email: Email, filters?: MailListFilters) {
  if (!filters) return true;
  if (filters.unreadOnly && email.status === "Opened") return false;
  if (filters.hasAttachment && !(email.attachments?.length || email.templateUsed)) {
    return false;
  }
  if (filters.statuses.length && !filters.statuses.includes(email.status)) {
    return false;
  }
  if (!matchesSystemDefined(filters.systemDefined, {
    createdDate: email.sentDate,
    modifiedDate: email.openedDate,
  })) {
    return false;
  }
  return matchesFieldClauses(
    filters.clauses,
    (id) => getEmailFieldValue(email, id),
    EMAIL_FILTER_FIELDS,
  );
}

export function reminderMatchesDeepFilters(
  reminder: Reminder,
  filters?: ReminderFilters,
) {
  if (!filters) return true;
  if (!matchesSystemDefined(filters.systemDefined, {})) return false;
  return matchesFieldClauses(
    filters.clauses,
    (id) => getReminderFieldValue(reminder, id),
    REMINDER_FILTER_FIELDS,
  );
}
