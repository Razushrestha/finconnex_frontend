/** Backend Activity Timeline contracts (Phase 2). */

export const ACTIVITY_PARENT_TYPES = [
  "LEAD",
  "CONTACT",
  "COMPANY",
  "DEAL",
  "QUOTE",
  "ESTIMATE",
  "INVOICE",
  "CREDIT_NOTE",
] as const;

export type ActivityParentType = (typeof ACTIVITY_PARENT_TYPES)[number];

export const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "NOTE",
  "TASK",
  "DEMO",
  "FOLLOW_UP",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type SafeActivityActor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export type ActivityParentSummary = {
  id: string;
  type: ActivityParentType;
  label: string;
};

export type NormalizedActivityTimelineItem = {
  id: string;
  activityType: ActivityType;
  actor?: SafeActivityActor;
  subject: string;
  summary?: string;
  relatedEntity?: ActivityParentSummary;
  occurredAt: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ActivityTimelinePagination = {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
};

export type ActivityTimelinePage = {
  items: NormalizedActivityTimelineItem[];
  metadata: ActivityTimelinePagination;
};

export type ActivityTimelineFilters = {
  page?: number;
  limit?: number;
  type?: ActivityType;
  from?: string;
  to?: string;
};

/** Compact row for lead/deal “Recent Activity” cards. */
export type ActivityTimelineRow = {
  id: string;
  label: string;
  when: string;
  activityType: ActivityType;
  summary?: string;
  actorLabel?: string;
};
