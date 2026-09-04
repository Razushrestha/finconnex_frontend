/** Ticket SLA configuration — GET/PUT /v1/workspaces/{id}/tickets/sla (M3) */

export type TicketPriorityCode = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const TICKET_PRIORITY_CODES: TicketPriorityCode[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export type PrioritySla = {
  responseMinutes: number | null;
  resolutionMinutes: number | null;
};

export type PrioritySlaMap = Record<TicketPriorityCode, PrioritySla>;

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export const WEEKDAYS: { code: Weekday; label: string }[] = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
];

export type WeekdayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type BusinessHoursConfig = {
  timezone: string;
  days: Record<Weekday, WeekdayHours>;
};

export type TicketSlaConfig = {
  isActive: boolean;
  showBadgesOnCards: boolean;
  prioritySlas: PrioritySlaMap;
  useBusinessHours: boolean;
  businessHours: BusinessHoursConfig;
  holidays: string[];
  warnBeforeBreachMinutes: number;
  autoCloseAfterResolvedMinutes: number | null;
};

const DEFAULT_WEEKDAY_HOURS: WeekdayHours = {
  enabled: true,
  start: "09:00",
  end: "17:00",
};

export const DEFAULT_TICKET_SLA_CONFIG: TicketSlaConfig = {
  isActive: true,
  showBadgesOnCards: true,
  prioritySlas: {
    CRITICAL: { responseMinutes: 30, resolutionMinutes: 240 },
    HIGH: { responseMinutes: 60, resolutionMinutes: 480 },
    MEDIUM: { responseMinutes: 240, resolutionMinutes: 1440 },
    LOW: { responseMinutes: 480, resolutionMinutes: 4320 },
  },
  useBusinessHours: false,
  businessHours: {
    timezone: "UTC",
    days: {
      sun: { ...DEFAULT_WEEKDAY_HOURS, enabled: false },
      mon: { ...DEFAULT_WEEKDAY_HOURS },
      tue: { ...DEFAULT_WEEKDAY_HOURS },
      wed: { ...DEFAULT_WEEKDAY_HOURS },
      thu: { ...DEFAULT_WEEKDAY_HOURS },
      fri: { ...DEFAULT_WEEKDAY_HOURS },
      sat: { ...DEFAULT_WEEKDAY_HOURS, enabled: false },
    },
  },
  holidays: [],
  warnBeforeBreachMinutes: 30,
  autoCloseAfterResolvedMinutes: 4320,
};
