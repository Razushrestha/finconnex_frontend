import type { EmailStatus } from "@/lib/emails/types";
import type { FieldClause } from "@/lib/filters/types";
import type { NoteType } from "@/lib/notes/types";
import type { MessageStatus, MessageType } from "@/lib/messages/types";
import type { MeetingStatus, MeetingType } from "@/lib/meetings/types";
import type { CallStatus, CallType } from "@/lib/calls/types";

export interface LeadFilters {
  sources: string[];
  statuses: string[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_LEAD_FILTERS: LeadFilters = {
  sources: [],
  statuses: [],
  systemDefined: [],
  clauses: [],
};

export interface DealFilters {
  stages: string[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_DEAL_FILTERS: DealFilters = {
  stages: [],
  systemDefined: [],
  clauses: [],
};

export interface ContactFilters {
  sources: string[];
  statuses: string[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_CONTACT_FILTERS: ContactFilters = {
  sources: [],
  statuses: [],
  systemDefined: [],
  clauses: [],
};

export interface CompanyFilters {
  statuses: string[];
  sources: string[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_COMPANY_FILTERS: CompanyFilters = {
  statuses: [],
  sources: [],
  systemDefined: [],
  clauses: [],
};

export interface CallFilters {
  statuses: CallStatus[];
  types: CallType[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_CALL_FILTERS: CallFilters = {
  statuses: [],
  types: [],
  systemDefined: [],
  clauses: [],
};

export interface MeetingFilters {
  statuses: MeetingStatus[];
  types: MeetingType[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_MEETING_FILTERS: MeetingFilters = {
  statuses: [],
  types: [],
  systemDefined: [],
  clauses: [],
};

export interface NoteFilters {
  types: NoteType[];
  flags: string[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_NOTE_FILTERS: NoteFilters = {
  types: [],
  flags: [],
  systemDefined: [],
  clauses: [],
};

export interface MessageFilters {
  types: MessageType[];
  statuses: MessageStatus[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_MESSAGE_FILTERS: MessageFilters = {
  types: [],
  statuses: [],
  systemDefined: [],
  clauses: [],
};

export interface MailListFilters {
  unreadOnly: boolean;
  hasAttachment: boolean;
  statuses: EmailStatus[];
  systemDefined: string[];
  clauses: FieldClause[];
}

export const EMPTY_MAIL_FILTERS: MailListFilters = {
  unreadOnly: false,
  hasAttachment: false,
  statuses: [],
  systemDefined: [],
  clauses: [],
};
