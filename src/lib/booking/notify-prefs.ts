/** Consultation notification channel prefs (no CRM send side-effects). */

export type NotifyChannel = "Email" | "In-app" | "SMS" | "WhatsApp";

export type BookingNotifyEvent =
  | "unconfirmed"
  | "confirmed"
  | "cancel"
  | "reschedule"
  | "reminder"
  | "followup";

export type NotificationRow = {
  id: BookingNotifyEvent;
  title: string;
  description: string;
  info: string;
  channels: Record<NotifyChannel, boolean>;
  emailSubject: string;
  emailBody: string;
  fromName: string;
  fromAddress: string;
  smsBody: string;
  notifyContact: boolean;
  notifyUser: boolean;
};

export const NOTIFY_CHANNELS: NotifyChannel[] = [
  "Email",
  "In-app",
  "SMS",
  "WhatsApp",
];

export const DEFAULT_NOTIFICATIONS: NotificationRow[] = [
  {
    id: "unconfirmed",
    title: "Appointment booked (Status: Unconfirmed)",
    description: "Notifies when an appointment is booked with an unconfirmed status.",
    info: "This notification is sent when an appointment is created with Unconfirmed status.",
    channels: { Email: false, "In-app": false, SMS: false, WhatsApp: false },
    emailSubject: "Appointment request on {{appointment.start_time}}",
    emailBody:
      "Hi {{contact.first_name}},\n\nYour appointment request has been received.",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody:
      "Unconfirmed: Appointment with {{contact.name}} on {{appointment.start_time}}.",
    notifyContact: true,
    notifyUser: false,
  },
  {
    id: "confirmed",
    title: "Appointment booked (Status: Confirmed)",
    description: "Notifies when an appointment is successfully confirmed.",
    info: "This notification is sent when an appointment is created with or updated to the Confirmed status.",
    channels: { Email: true, "In-app": true, SMS: true, WhatsApp: false },
    emailSubject:
      "Appointment Confirmation on {{appointment.start_time}} ({{appointment.timezone}})",
    emailBody:
      "Hi {{contact.first_name}},\n\nYour appointment has been scheduled. Here are the details of your upcoming appointment:\n\nAppointment Title: {{appointment.title}}\nWhen: {{datetime}}\nWhere: {{location}}",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody:
      "Confirmed: {{appointment.title}} on {{appointment.start_time}} ({{appointment.timezone}}).",
    notifyContact: true,
    notifyUser: false,
  },
  {
    id: "cancel",
    title: "Cancellation",
    description: "Alerts when an appointment is canceled.",
    info: "This notification is sent when an appointment is canceled.",
    channels: { Email: true, "In-app": false, SMS: true, WhatsApp: false },
    emailSubject: "Appointment canceled",
    emailBody: "Hi {{contact.first_name}},\n\nYour appointment has been canceled.",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody: "Canceled: Appointment with {{contact.name}}.",
    notifyContact: true,
    notifyUser: false,
  },
  {
    id: "reschedule",
    title: "Reschedule",
    description: "Notifies when an appointment is rescheduled.",
    info: "This notification is sent when an appointment is rescheduled.",
    channels: { Email: true, "In-app": false, SMS: true, WhatsApp: false },
    emailSubject: "Appointment rescheduled",
    emailBody:
      "Hi {{contact.first_name}},\n\nYour appointment has been rescheduled to {{appointment.start_time}}.",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody:
      "Rescheduled: Appointment with {{contact.name}} on {{appointment.start_time}}.",
    notifyContact: true,
    notifyUser: false,
  },
  {
    id: "reminder",
    title: "Reminder",
    description: "Sends a reminder before the appointment.",
    info: "This notification is sent before the appointment starts.",
    channels: { Email: true, "In-app": false, SMS: true, WhatsApp: false },
    emailSubject: "Reminder: {{appointment.title}}",
    emailBody:
      "Hi {{contact.first_name}},\n\nThis is a reminder for your upcoming appointment at {{datetime}}.",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody: "Reminder: Appointment on {{appointment.start_time}}.",
    notifyContact: true,
    notifyUser: false,
  },
  {
    id: "followup",
    title: "Follow-Up",
    description: "Sends a follow-up message after the appointment is completed.",
    info: "This notification is sent after the appointment is completed.",
    channels: { Email: false, "In-app": false, SMS: false, WhatsApp: false },
    emailSubject: "Thanks for meeting with us",
    emailBody: "Hi {{contact.first_name}},\n\nThank you for your appointment.",
    fromName: "{{appointment.user.name}}",
    fromAddress: "{{appointment.user.email}}",
    smsBody: "Thanks for your appointment with {{appointment.user.name}}.",
    notifyContact: true,
    notifyUser: false,
  },
];

export function mergeNotificationPrefs(
  rows?: NotificationRow[] | null,
): NotificationRow[] {
  return DEFAULT_NOTIFICATIONS.map((def) => {
    const found = rows?.find((row) => row.id === def.id);
    if (!found) return { ...def, channels: { ...def.channels } };
    return {
      ...def,
      ...found,
      id: def.id,
      channels: { ...def.channels, ...found.channels },
      notifyContact: found.notifyContact ?? def.notifyContact,
      notifyUser: found.notifyUser ?? def.notifyUser,
    };
  });
}

export function notificationRowFor(
  prefs: NotificationRow[] | undefined,
  event: BookingNotifyEvent,
): NotificationRow {
  return (
    mergeNotificationPrefs(prefs).find((row) => row.id === event) ??
    DEFAULT_NOTIFICATIONS.find((row) => row.id === event)!
  );
}

export function enabledNotifyChannels(row: NotificationRow): NotifyChannel[] {
  return NOTIFY_CHANNELS.filter((channel) => row.channels[channel]);
}

export type NotifyTokens = {
  name: string;
  firstName: string;
  email: string;
  phone: string;
  datetime: string;
  location: string;
  title: string;
  timezone: string;
  owner: string;
  ownerEmail: string;
  joinUrl?: string;
  reference?: string;
};

export function interpolateNotify(template: string, tokens: NotifyTokens) {
  return template
    .replace(/\{\{contact\.first_name\}\}/gi, tokens.firstName)
    .replace(/\{\{contact\.name\}\}/gi, tokens.name)
    .replace(/\{\{contact\.email\}\}/gi, tokens.email)
    .replace(/\{\{contact\.phone\}\}/gi, tokens.phone)
    .replace(/\{\{appointment\.start_time\}\}/gi, tokens.datetime)
    .replace(/\{\{appointment\.timezone\}\}/gi, tokens.timezone)
    .replace(/\{\{appointment\.title\}\}/gi, tokens.title)
    .replace(/\{\{appointment\.user\.name\}\}/gi, tokens.owner)
    .replace(/\{\{appointment\.user\.email\}\}/gi, tokens.ownerEmail)
    .replace(/\{\{name\}\}/gi, tokens.name)
    .replace(/\{\{datetime\}\}/gi, tokens.datetime)
    .replace(/\{\{location\}\}/gi, tokens.location)
    .replace(/\{\{joinUrl\}\}/gi, tokens.joinUrl ?? "")
    .replace(/\{\{reference\}\}/gi, tokens.reference ?? "");
}
