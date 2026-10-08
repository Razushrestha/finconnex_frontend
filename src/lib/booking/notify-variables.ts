/**
 * What can be dropped into a booking notification, and how dates are written in
 * it. Plain data and string helpers (no React) so the editor, the sender and the
 * tests all read the same list.
 */

export type NotifyVariable = { label: string; token: string };
export type NotifyVariableGroup = { title: string; items: NotifyVariable[] };

/** The "Insert Variable" menu, in the order it is shown. */
export const NOTIFY_VARIABLE_GROUPS: NotifyVariableGroup[] = [
  {
    title: "Business",
    items: [
      { label: "Business Name", token: "{{business.name}}" },
      { label: "Business Contact Number", token: "{{business.phone}}" },
      { label: "Business Address", token: "{{business.address}}" },
    ],
  },
  {
    title: "Staff",
    items: [
      { label: "Staff Name", token: "{{appointment.user.name}}" },
      { label: "Staff Email", token: "{{appointment.user.email}}" },
      { label: "Staff Contact Number", token: "{{staff.phone}}" },
      { label: "Staff ID", token: "{{staff.id}}" },
      { label: "Staff Timezone", token: "{{staff.timezone}}" },
      { label: "Staff Additional Info", token: "{{staff.additional_info}}" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Workspace Booking URL", token: "{{workspace.booking_url}}" },
    ],
  },
  {
    title: "Service",
    items: [
      { label: "Consultation Name", token: "{{appointment.title}}" },
      { label: "Service Booking URL", token: "{{service.booking_url}}" },
      { label: "Service Description", token: "{{service.description}}" },
    ],
  },
  {
    title: "Buffer Time",
    items: [
      { label: "Pre-buffer", token: "{{buffer.pre}}" },
      { label: "Post-buffer", token: "{{buffer.post}}" },
    ],
  },
  {
    title: "Client",
    items: [
      { label: "Client Name", token: "{{contact.name}}" },
      { label: "Client Email", token: "{{contact.email}}" },
      { label: "Client Contact Number", token: "{{contact.phone}}" },
      { label: "Client First Name", token: "{{contact.first_name}}" },
      { label: "Client Last Name", token: "{{contact.last_name}}" },
    ],
  },
  {
    title: "Appointment",
    items: [
      { label: "Appointment Id", token: "{{appointment.id}}" },
      { label: "Appointment Time", token: "{{appointment.time}}" },
      { label: "Appointment From Date", token: "{{appointment.from_date}}" },
      { label: "Appointment To Date", token: "{{appointment.to_date}}" },
      { label: "Booking Id", token: "{{booking.id}}" },
      { label: "Booking Summary URL", token: "{{booking.summary_url}}" },
      { label: "Booknow Link", token: "{{booking.book_now_url}}" },
    ],
  },
  {
    title: "Meeting Details",
    items: [{ label: "Meeting Info", token: "{{meeting.info}}" }],
  },
];

/** Every token in the menu, flat. */
export const NOTIFY_VARIABLE_TOKENS: string[] = NOTIFY_VARIABLE_GROUPS.flatMap(
  (group) => group.items.map((item) => item.token),
);

/* ------------------------------ date formats ------------------------------ */

/** The date styles offered under "Select Date Format For Mail". */
export const DATE_FORMATS = [
  "dd-MMM-yy",
  "dd-MMM-yyyy",
  "dd-MMMM-yy",
  "dd-MMMM-yyyy",
  "MM-dd-yy",
  "yy-MM-dd",
  "MM.dd.yy",
  "dd/MM/yyyy",
  "dd MMM, yy",
  "MMM dd, yy",
  "dd MMM, yyyy",
  "MMM dd, yyyy",
  "dd MMMM, yy",
  "MMMM dd, yy",
  "dd MMMM, yyyy",
  "MMMM dd, yyyy",
] as const;

export const DEFAULT_DATE_FORMAT = "dd-MMM-yyyy";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Anything that is not one of the offered styles falls back to the default. */
export function normalizeDateFormat(value?: string | null): string {
  return (DATE_FORMATS as readonly string[]).includes(value ?? "")
    ? (value as string)
    : DEFAULT_DATE_FORMAT;
}

/**
 * Writes a date in one of the styles above. Month names are always English so
 * an email reads the same whatever language the sender's browser is set to.
 */
export function formatDatePattern(date: Date, pattern: string): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const monthName = MONTHS[date.getMonth()] ?? "";
  return pattern.replace(/yyyy|yy|MMMM|MMM|MM|dd/g, (part) => {
    switch (part) {
      case "yyyy":
        return year;
      case "yy":
        return year.slice(-2);
      case "MMMM":
        return monthName;
      case "MMM":
        return monthName.slice(0, 3);
      case "MM":
        return month;
      default:
        return day;
    }
  });
}

/** Dropdown rows like `dd-MMM-yyyy (02-Oct-2026)`, previewed with `now`. */
export function dateFormatOptions(
  now: Date = new Date(),
): Array<{ value: string; label: string }> {
  return DATE_FORMATS.map((format) => ({
    value: format,
    label: `${format} (${formatDatePattern(now, format)})`,
  }));
}

/* -------------------------------- helpers -------------------------------- */

/** "None", "15 minutes", "1 hour", "1 hour 30 minutes". */
export function minutesLabel(minutes?: number): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total === 0) return "None";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (mins) parts.push(`${mins} ${mins === 1 ? "minute" : "minutes"}`);
  return parts.join(" ");
}

/** Puts `token` where the caret is, replacing any selected text. */
export function insertAtSelection(
  value: string,
  start: number | null | undefined,
  end: number | null | undefined,
  token: string,
): { value: string; caret: number } {
  const from = Math.min(Math.max(start ?? value.length, 0), value.length);
  const to = Math.min(Math.max(end ?? from, from), value.length);
  return {
    value: value.slice(0, from) + token + value.slice(to),
    caret: from + token.length,
  };
}
