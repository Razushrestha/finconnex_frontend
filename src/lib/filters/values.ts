import { formatRelatedTo } from "@/lib/activities/shared";
import type { Call } from "@/lib/calls/types";
import type { CompanyCardData } from "@/lib/companies/types";
import type { ContactCardData } from "@/lib/contacts/types";
import type { DealRecord } from "@/lib/deals/types";
import type { Email } from "@/lib/emails/types";
import {
  readLeadFactFindValue,
  type ApplicantRole,
} from "@/lib/leads/fact-find-bridge";
import type { LeadCardData } from "@/lib/leads/types";
import type { Meeting } from "@/lib/meetings/types";
import type { Message } from "@/lib/messages/types";
import type { Note } from "@/lib/notes/types";
import { parseEmployments, parseIncomes } from "@/lib/portals/mortgage";
import type { Reminder } from "@/lib/reminders/types";
import type { Task } from "@/lib/tasks/types";

type LeadLike = LeadCardData & {
  statusTitle?: string;
  stageTitle?: string;
};

function customOf(card: LeadLike, key: string) {
  return card.custom?.[key] ?? "";
}

function slotParts(fieldId: string): {
  role: ApplicantRole;
  rest: string;
} {
  if (fieldId.startsWith("secondary.")) {
    return { role: "secondary", rest: fieldId.slice("secondary.".length) };
  }
  return { role: "primary", rest: fieldId };
}

function parseSlot(rest: string) {
  const match = rest.match(/^slot\.(income|emp)\.(\d+)\.(.+)$/);
  if (!match) return null;
  return {
    kind: match[1] as "income" | "emp",
    index: Number(match[2]) - 1,
    prop: match[3],
  };
}

export function getLeadFieldValue(card: LeadLike, fieldId: string): unknown {
  if (fieldId.startsWith("cf:")) return customOf(card, fieldId.slice(3));
  if (fieldId.startsWith("web.")) {
    return customOf(card, fieldId) || customOf(card, fieldId.slice(4));
  }

  const { role, rest } = slotParts(fieldId);
  const slot = parseSlot(rest);
  if (slot) {
    const incomes = parseIncomes(
      readLeadFactFindValue(card, "incomesJson", role),
    );
    const jobs = parseEmployments(
      readLeadFactFindValue(card, "employmentsJson", role),
    );
    if (slot.kind === "income") {
      const row = incomes[slot.index];
      if (slot.prop === "amount") {
        return (
          row?.amount ||
          (slot.index === 0
            ? readLeadFactFindValue(card, "annualIncome", role)
            : "")
        );
      }
      return row ? (row as Record<string, unknown>)[slot.prop] : "";
    }
    const job = jobs[slot.index];
    if (!job) {
      if (slot.index === 0 && slot.prop === "type") {
        return readLeadFactFindValue(card, "employmentType", role);
      }
      if (slot.index === 0 && slot.prop === "employer") {
        return readLeadFactFindValue(card, "employer", role);
      }
      if (slot.index === 0 && slot.prop === "occupation") {
        return readLeadFactFindValue(card, "occupation", role);
      }
      return "";
    }
    if (slot.prop === "status") return job.current ? "Current" : "Previous";
    return (job as Record<string, unknown>)[slot.prop] ?? "";
  }

  switch (fieldId) {
    case "name":
      return card.name;
    case "email":
      return card.email;
    case "phone":
      return card.phone;
    case "mobilePhone":
      return card.mobilePhone || readLeadFactFindValue(card, "mobile");
    case "company":
      return card.company;
    case "companyWebsite":
      return card.companyWebsite;
    case "industry":
      return card.industry;
    case "companySize":
      return card.companySize;
    case "jobTitle":
      return card.jobTitle;
    case "department":
      return card.department;
    case "source":
      return card.source;
    case "status":
      return card.statusTitle;
    case "pipelineStage":
      return card.pipelineStage || card.stageTitle || card.statusTitle;
    case "owner":
      return card.owner;
    case "createdDate":
      return card.createdDate;
    case "modifiedDate":
      return card.modifiedDate;
    case "notes":
      return card.notes;
    case "description":
      return card.description;
    case "productInterest":
      return card.productInterest;
    case "budgetRange":
      return card.budgetRange;
    case "estimatedValue":
      return card.estimatedValue;
    case "tags":
      return card.tags ?? [];
    case "city":
      return card.city;
    case "state":
      return card.state;
    case "country":
      return card.country;
    case "street":
      return card.street;
    case "postalCode":
      return card.postalCode;
    case "linkedinUrl":
      return card.linkedinUrl;
    case "websiteUrl":
      return card.websiteUrl;
    case "lifecycleStage":
      return card.lifecycleStage;
    case "rating":
      return card.rating;
    case "score":
      return card.score;
    default:
      break;
  }

  const factFindId = fieldId.startsWith("secondary.")
    ? fieldId.slice("secondary.".length)
    : fieldId;
  const factRole: ApplicantRole = fieldId.startsWith("secondary.")
    ? "secondary"
    : "primary";
  const fromFactFind = readLeadFactFindValue(card, factFindId, factRole);
  if (fromFactFind) return fromFactFind;
  return customOf(card, fieldId);
}

export function getDealFieldValue(
  deal: DealRecord & { stageTitle?: string; lostReason?: string },
  fieldId: string,
): unknown {
  if (fieldId.startsWith("cf:")) return undefined;
  switch (fieldId) {
    case "name":
      return deal.name;
    case "account":
      return deal.account;
    case "contact":
      return deal.contact;
    case "value":
      return deal.value;
    case "currency":
      return deal.currency;
    case "probability":
      return deal.probability;
    case "owner":
      return deal.owner;
    case "closeDate":
      return deal.closeDate;
    case "stage":
      return deal.stageTitle;
    case "tags":
      return deal.tags ?? [];
    case "lostReason":
      return deal.lostReason;
    default:
      return undefined;
  }
}

export function getContactFieldValue(
  contact: ContactCardData & { statusTitle?: string },
  fieldId: string,
): unknown {
  if (fieldId.startsWith("cf:")) return undefined;
  if (fieldId.startsWith("web.")) return undefined;
  switch (fieldId) {
    case "name":
      return contact.name;
    case "company":
      return contact.company;
    case "email":
      return contact.email;
    case "phone":
      return contact.phone;
    case "mobile":
      return contact.mobile;
    case "owner":
      return contact.owner;
    case "source":
      return contact.source;
    case "status":
      return contact.statusTitle;
    case "createdDate":
      return contact.createdDate;
    case "tags":
      return contact.tags ?? [];
    default:
      return undefined;
  }
}

export function getCompanyFieldValue(
  company: CompanyCardData & { statusTitle?: string },
  fieldId: string,
): unknown {
  switch (fieldId) {
    case "name":
      return company.name;
    case "website":
      return company.website;
    case "industry":
      return company.industry;
    case "phone":
      return company.phone;
    case "owner":
      return company.owner;
    case "annualRevenue":
      return company.annualRevenue;
    case "city":
      return company.city;
    case "tags":
      return company.tags ?? [];
    case "status":
      return company.statusTitle;
    default:
      return undefined;
  }
}

export function getTaskFieldValue(task: Task, fieldId: string): unknown {
  switch (fieldId) {
    case "title":
      return task.title;
    case "taskId":
      return task.taskId;
    case "taskType":
      return task.taskType;
    case "priority":
      return task.priority;
    case "status":
      return task.status;
    case "dueDate":
      return task.dueDate;
    case "assignedTo":
      return task.assignedTo;
    case "relatedTo":
      return formatRelatedTo(task.relatedTo);
    case "reminderDate":
      return task.reminderDate;
    case "createdBy":
      return task.createdBy;
    case "createdOn":
      return task.createdOn;
    case "modifiedBy":
      return task.modifiedBy;
    case "modifiedOn":
      return task.modifiedOn;
    case "description":
      return task.description;
    case "notes":
      return task.notes;
    case "completedBy":
      return task.completedBy;
    case "completedDate":
      return task.completedDate;
    case "collaborators":
      return task.collaborators ?? [];
    default:
      return undefined;
  }
}

export function getCallFieldValue(call: Call, fieldId: string): unknown {
  switch (fieldId) {
    case "subject":
      return call.subject;
    case "relatedTo":
      return call.relatedTo;
    case "contact":
      return call.contact;
    case "callFor":
      return call.callFor;
    case "fromNumber":
      return call.fromNumber;
    case "callType":
      return call.callType;
    case "status":
      return call.status;
    case "date":
      return call.date;
    case "duration":
      return call.duration;
    case "notes":
      return call.notes;
    case "agenda":
      return call.agenda;
    case "purpose":
      return call.purpose;
    case "assignedTo":
      return call.assignedTo;
    case "calledBy":
      return call.calledBy;
    case "outcome":
      return call.outcome;
    case "createdBy":
      return call.createdBy;
    case "createdOn":
      return call.createdOn;
    default:
      return undefined;
  }
}

export function getMeetingFieldValue(meeting: Meeting, fieldId: string): unknown {
  switch (fieldId) {
    case "title":
      return meeting.title;
    case "type":
      return meeting.type;
    case "status":
      return meeting.status;
    case "relatedTo":
      return meeting.relatedTo;
    case "organizer":
      return meeting.organizer;
    case "attendees":
      return meeting.attendees.map((item) => item.name).join(", ");
    case "startDateTime":
      return meeting.startDateTime;
    case "endDateTime":
      return meeting.endDateTime;
    case "location":
      return meeting.location;
    case "meetingLink":
      return meeting.meetingLink;
    case "agenda":
      return meeting.agenda;
    case "notes":
      return meeting.notes;
    default:
      return undefined;
  }
}

export function getNoteFieldValue(note: Note, fieldId: string): unknown {
  switch (fieldId) {
    case "title":
      return note.title;
    case "body":
      return note.body;
    case "noteType":
      return note.noteType;
    case "relatedTo":
      return note.relatedTo;
    case "createdBy":
      return note.createdBy;
    case "createdAt":
      return note.createdAt;
    case "updatedBy":
      return note.updatedBy;
    case "updatedAt":
      return note.updatedAt;
    case "isPinned":
      return note.isPinned ? "Yes" : "No";
    case "isPrivate":
      return note.isPrivate ? "Yes" : "No";
    case "owner":
      return note.createdBy;
    default:
      return undefined;
  }
}

export function getMessageFieldValue(message: Message, fieldId: string): unknown {
  switch (fieldId) {
    case "subject":
      return message.subject;
    case "body":
      return message.body;
    case "type":
      return message.type;
    case "status":
      return message.status;
    case "from":
      return message.from;
    case "to":
      return message.to;
    case "relatedTo":
      return message.relatedTo;
    case "sentDate":
      return message.sentDate;
    case "template":
      return message.template;
    default:
      return undefined;
  }
}

export function getEmailFieldValue(email: Email, fieldId: string): unknown {
  switch (fieldId) {
    case "subject":
      return email.subject;
    case "body":
      return email.body;
    case "from":
      return email.from;
    case "to":
      return email.to.join(", ");
    case "relatedTo":
      return email.relatedTo;
    case "status":
      return email.status;
    case "templateUsed":
      return email.templateUsed;
    case "importance":
      return email.importance;
    case "sentDate":
      return email.sentDate;
    case "openedDate":
      return email.openedDate;
    default:
      return undefined;
  }
}

export function getReminderFieldValue(reminder: Reminder, fieldId: string): unknown {
  switch (fieldId) {
    case "title":
      return reminder.title;
    case "relatedTo":
      return reminder.relatedTo;
    case "dateTime":
      return reminder.dateTime;
    case "type":
      return reminder.type;
    case "status":
      return reminder.status;
    case "notificationMethod":
      return reminder.notificationMethod;
    case "owner":
      return reminder.owner;
    default:
      return undefined;
  }
}
