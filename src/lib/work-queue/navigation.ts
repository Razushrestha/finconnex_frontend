export const WORK_QUEUE_FROM = "work-queue";
export const WORK_QUEUE_PATH = "/work-queue";

const DETAIL_PATH: Record<string, (id: string) => string> = {
  tasks: (id) => `/activities/tasks/detail/${encodeURIComponent(id)}`,
  calls: (id) => `/activities/calls/detail/${encodeURIComponent(id)}`,
  meetings: (id) => `/activities/meetings/detail/${encodeURIComponent(id)}`,
  emails: (id) => `/activities/emails/detail/${encodeURIComponent(id)}`,
  messages: (id) => `/activities/messages/detail/${encodeURIComponent(id)}`,
  reminders: (id) => `/activities/reminders/detail/${encodeURIComponent(id)}`,
  notes: (id) => `/activities/notes/detail/${encodeURIComponent(id)}`,
  attachments: () => `/activities/attachments`,
  documents: (id) => `/documents/requests/${encodeURIComponent(id)}`,
  leads: (id) => `/sales/leads/detail/${encodeURIComponent(id)}`,
  contacts: (id) => `/sales/contacts/detail/${encodeURIComponent(id)}`,
  deals: (id) => `/sales/deals/detail/${encodeURIComponent(id)}`,
};

/** Work Queue row → module detail, with a return path for Back. */
export function workQueueRecordHref(module: string, id: string): string {
  const build = DETAIL_PATH[module];
  const path = build ? build(id) : `/${module}`;
  return `${path}?from=${WORK_QUEUE_FROM}`;
}

export function isFromWorkQueue(from: string | null | undefined): boolean {
  return from === WORK_QUEUE_FROM;
}

export function moduleBackHref(
  from: string | null | undefined,
  fallbackHref: string,
): string {
  return isFromWorkQueue(from) ? WORK_QUEUE_PATH : fallbackHref;
}

export function moduleBackLabel(
  from: string | null | undefined,
  fallbackLabel: string,
): string {
  return isFromWorkQueue(from) ? "Back to Workqueue" : fallbackLabel;
}
