"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Italic,
  List,
  ListOrdered,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Underline,
  UserX,
  XCircle,
} from "lucide-react";
import { NotificationEditModal } from "@/components/booking/BookingNotificationsStep";
import { loadSettingsValues } from "@/lib/settings/settings-store";
import { getRulesActor } from "@/lib/rules/actor";
import {
  mergeNotificationPrefs,
  type NotificationRow,
  type NotifyChannel,
} from "@/lib/booking/notify-prefs";
import type { BookingPage } from "@/lib/booking/types";
import {
  listAssignableOwnersLocal,
  loadWorkspaceConsultants,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "h-10 w-full appearance-none rounded-lg border border-[#E5E7EB] bg-white bg-[length:16px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-[#5A32A3]/40";

const SELECT_BG = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
} as const;

export const NOTIFY_PANELS = [
  { id: "email", title: "Email", icon: Mail },
  { id: "sms", title: "SMS", icon: MessageSquare },
  { id: "calendar", title: "Calendar Invites", icon: CalendarDays },
  { id: "whatsapp", title: "WhatsApp", icon: MessageCircle },
] as const;

export type NotifyPanelId = (typeof NOTIFY_PANELS)[number]["id"];

const STAGE_TILES: {
  id: NotificationRow["id"];
  label: string;
  icon: typeof Clock;
}[] = [
  { id: "confirmed", label: "Booked", icon: Clock },
  { id: "reschedule", label: "Rescheduled", icon: RefreshCw },
  { id: "cancel", label: "Canceled", icon: XCircle },
  { id: "followup", label: "Completed", icon: CheckCircle2 },
  { id: "noshow", label: "No Show", icon: UserX },
];

const REMINDER_UNITS = ["Minutes", "Hours", "Days"] as const;
type ReminderUnit = (typeof REMINDER_UNITS)[number];

type ReminderDraft = { value: number; unit: ReminderUnit };

function channelForPanel(panel: NotifyPanelId): NotifyChannel | null {
  if (panel === "email") return "Email";
  if (panel === "sms") return "SMS";
  if (panel === "whatsapp") return "WhatsApp";
  return null;
}

function headingFor(panel: NotifyPanelId) {
  if (panel === "email") return "Email Notifications and Reminders";
  if (panel === "sms") return "SMS Notifications and Reminders";
  if (panel === "whatsapp") return "Whatsapp Notifications and Reminders";
  return "Calendar Invites";
}

const CALENDAR_VARS = [
  { token: "%servicename%", label: "Service Name" },
  { token: "%customername%", label: "Customer Name" },
  { token: "%serviceid%", label: "Booking ID" },
  { token: "%staffname%", label: "Staff Name" },
  { token: "%scheduledate%", label: "Schedule Date" },
  { token: "%scheduletime%", label: "Schedule Time" },
  { token: "%duration%", label: "Duration" },
  { token: "%location%", label: "Location" },
  { token: "%customeremail%", label: "Customer Email" },
];

const DEFAULT_CAL_TITLE = "%servicename% with %customername%";
const DEFAULT_CAL_DESC = [
  "Customer Info",
  "Name  %customername%",
  "Booking ID  %serviceid%",
  "",
  "Service Info",
  "Service Name  %servicename%",
].join("\n");

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function InsertVariable({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-[12px] font-medium text-[#5A32A3] hover:bg-[#F8F5FC]"
      >
        Insert Variable
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
          {CALENDAR_VARS.map((item) => (
            <button
              key={item.token}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-[#F3ECFB]"
              onClick={() => {
                onInsert(item.token);
                setOpen(false);
              }}
            >
              {item.label}
              <span className="ml-1 text-slate-400">{item.token}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CalendarInvitesEditor({
  page,
  onSaved,
}: {
  page: BookingPage;
  onSaved: (page: BookingPage) => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const seeded = page.calendarInvite;
  const [includeBuffer, setIncludeBuffer] = useState(
    seeded?.includeBufferTime ?? true,
  );
  const [title, setTitle] = useState(
    (seeded?.eventTitle || DEFAULT_CAL_TITLE).slice(0, 255),
  );
  const [description, setDescription] = useState(
    seeded?.eventDescription || page.inviteNotes || DEFAULT_CAL_DESC,
  );

  useEffect(() => {
    if (!descRef.current) return;
    if (!descRef.current.innerText.trim() && description) {
      descRef.current.innerText = description;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save(next: {
    includeBufferTime?: boolean;
    eventTitle?: string;
    eventDescription?: string;
  }) {
    const includeBufferTime = next.includeBufferTime ?? includeBuffer;
    const eventTitle = (next.eventTitle ?? title).slice(0, 255);
    const eventDescription = (next.eventDescription ?? description).slice(0, 1200);
    onSaved({
      ...page,
      calendarInvites: true,
      inviteNotes: stripHtml(eventDescription),
      calendarInvite: {
        includeBufferTime,
        eventTitle,
        eventDescription,
      },
    });
  }

  function insertTitleToken(token: string) {
    const el = titleRef.current;
    const start = el?.selectionStart ?? title.length;
    const end = el?.selectionEnd ?? start;
    const next = `${title.slice(0, start)}${token}${title.slice(end)}`.slice(0, 255);
    setTitle(next);
    save({ eventTitle: next });
    requestAnimationFrame(() => {
      const pos = start + token.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function insertDescToken(token: string) {
    descRef.current?.focus();
    document.execCommand("insertText", false, token);
    const next = (descRef.current?.innerText ?? description).slice(0, 1200);
    setDescription(next);
    save({ eventDescription: next });
  }

  function runFormat(command: string) {
    descRef.current?.focus();
    if (command === "createLink") {
      const href = window.prompt("Link URL")?.trim();
      if (!href) return;
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(command, false);
    }
    const next = (descRef.current?.innerText ?? description).slice(0, 1200);
    setDescription(next);
    save({ eventDescription: next });
  }

  const descLen = description.length;

  return (
    <div className="mt-5 max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-3 text-[13px] font-semibold text-slate-800">
            Include Buffer Time
            <button
              type="button"
              role="switch"
              aria-checked={includeBuffer}
              onClick={() => {
                const next = !includeBuffer;
                setIncludeBuffer(next);
                save({ includeBufferTime: next });
              }}
              className={cn(
                "relative h-5 w-9 rounded-full",
                includeBuffer ? "bg-[#5A32A3]" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  includeBuffer && "translate-x-4",
                )}
              />
            </button>
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            Adds pre-buffer and post-buffer times to the appointment&apos;s duration
            in calendar invites.
          </p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-slate-800">Event Title</p>
        <p className="mt-1 text-[12px] text-slate-500">
          Set a title that appears in calendar events, online meetings, assist
          sessions, and ICS files (Max 255 characters).
        </p>
        <div className="relative mt-2">
          <input
            ref={titleRef}
            value={title}
            maxLength={255}
            onChange={(e) => {
              const next = e.target.value.slice(0, 255);
              setTitle(next);
              save({ eventTitle: next });
            }}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 pr-36 text-[13px] text-slate-800 outline-none focus:border-[#5A32A3]/40"
          />
          <div className="absolute top-1 right-1">
            <InsertVariable onInsert={insertTitleToken} />
          </div>
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          Event Description
        </p>
        <p className="mt-1 flex items-start gap-1 text-[12px] text-slate-500">
          Set the description for calendar events (max 1,200 characters, including
          variable values).
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </p>
        <div className="mt-2 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-2 py-1.5">
            <div className="flex items-center gap-0.5 text-slate-500">
              {[
                { icon: Bold, cmd: "bold" },
                { icon: Italic, cmd: "italic" },
                { icon: Underline, cmd: "underline" },
                { icon: List, cmd: "insertUnorderedList" },
                { icon: ListOrdered, cmd: "insertOrderedList" },
                { icon: Paperclip, cmd: "createLink" },
              ].map((item) => (
                <button
                  key={item.cmd}
                  type="button"
                  aria-label={item.cmd}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runFormat(item.cmd);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100"
                >
                  <item.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <InsertVariable onInsert={insertDescToken} />
          </div>
          <div
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[180px] whitespace-pre-wrap px-3 py-3 text-[13px] leading-6 text-slate-800 outline-none"
            onInput={() => {
              const next = (descRef.current?.innerText ?? "").slice(0, 1200);
              setDescription(next);
              save({ eventDescription: next });
            }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] text-slate-400">
          {descLen}/1200
        </p>
      </div>
    </div>
  );
}

function smsGatewayConnected() {
  if (typeof window === "undefined") return false;
  const values = loadSettingsValues("integrations/twilio");
  const raw = values.connected ?? values.twilio_connected ?? values.enabled;
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

function whatsappAccount() {
  if (typeof window === "undefined") {
    return { connected: false, numbers: [] as { value: string; label: string }[] };
  }
  const values = loadSettingsValues("communication/whatsapp-business");
  const raw = values.connected ?? values.enabled;
  const connected = raw === true || raw === "true" || raw === 1 || raw === "1";
  const display =
    String(values.displayName ?? "").trim() || "WhatsApp Business";
  const phone = String(values.phoneNumberId ?? values.businessId ?? "").trim();
  const numbers =
    connected && phone
      ? [{ value: phone, label: `${display} (${phone})` }]
      : connected
        ? [{ value: display, label: display }]
        : [];
  return { connected, numbers };
}

function notifyBlurb(panel: NotifyPanelId, who: string) {
  if (panel === "whatsapp") {
    return `Send WhatsApp notifications for ${who} about booking confirmations, cancellations, or reschedules.`;
  }
  const channel =
    panel === "email" ? "email" : "SMS";
  return `Send customized ${channel} updates to ${who} at every stage of an appointment.`;
}

function reminderBlurb(panel: NotifyPanelId, who: string) {
  if (panel === "whatsapp") {
    return `Send WhatsApp reminders to reduce no-shows and keep ${who} informed about upcoming appointments.`;
  }
  const channel =
    panel === "email" ? "email" : "SMS";
  return `Remind ${who} of their upcoming appointment via ${channel}.`;
}

function toMinutes(value: number, unit: ReminderUnit) {
  if (unit === "Hours") return value * 60;
  if (unit === "Days") return value * 1440;
  return value;
}

function fromMinutes(minutes: number): ReminderDraft {
  if (minutes % 1440 === 0 && minutes >= 1440) {
    return { value: minutes / 1440, unit: "Days" };
  }
  if (minutes % 60 === 0 && minutes >= 60) {
    return { value: minutes / 60, unit: "Hours" };
  }
  return { value: Math.max(1, minutes), unit: "Minutes" };
}

function remindersFromPage(page: BookingPage): ReminderDraft[] {
  const stored = page.notifyReminders?.map((row) => fromMinutes(row.minutes));
  return stored?.length ? stored : [{ value: 30, unit: "Minutes" }];
}

function superAdminLabel(email: string) {
  return email
    ? `Super admin's email address (${email})`
    : "Super admin's email address";
}

export function ConsultationNotifyPanel({
  panel,
  page,
  onSaved,
}: {
  panel: NotifyPanelId;
  page: BookingPage;
  onSaved: (page: BookingPage) => void;
}) {
  const [audience, setAudience] = useState<"customer" | "user">("customer");
  const [reminders, setReminders] = useState<ReminderDraft[]>(() =>
    remindersFromPage(page),
  );
  const [menuId, setMenuId] = useState<NotificationRow["id"] | null>(null);
  const [editing, setEditing] = useState<NotificationRow | null>(null);
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const actor = getRulesActor();
  const actorEmail = actor.email?.trim() ?? "";

  const [emailConfig, setEmailConfig] = useState(() => ({
    sendFrom: page.emailNotifyConfig?.sendFrom || actorEmail,
    replyTo: page.emailNotifyConfig?.replyTo ?? "",
    cc: page.emailNotifyConfig?.cc ?? "",
  }));
  const [waSendFrom, setWaSendFrom] = useState(
    page.whatsappNotifyConfig?.sendFrom ?? "",
  );

  const rows = useMemo(
    () => mergeNotificationPrefs(page.notifyPrefs as NotificationRow[] | undefined),
    [page.notifyPrefs],
  );
  const channel = channelForPanel(panel);
  const who = audience === "customer" ? "Customer" : "User";
  const gatewayOn = smsGatewayConnected();

  useEffect(() => {
    void loadWorkspaceConsultants()
      .then((list) => {
        if (list.length) setOwners(list);
      })
      .catch(() => {
        setOwners((prev) => (prev.length ? prev : listAssignableOwnersLocal()));
      });
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const emailOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    if (actorEmail) {
      seen.add(actorEmail.toLowerCase());
      options.push({
        value: actorEmail,
        label: superAdminLabel(actorEmail),
      });
    }
    for (const owner of owners) {
      const email = owner.email.trim();
      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      options.push({
        value: email,
        label: `${owner.name} (${email})`,
      });
    }
    return options;
  }, [actorEmail, owners]);

  function persist(
    nextRows: NotificationRow[],
    nextReminders = reminders,
    nextEmail = emailConfig,
    nextWa = waSendFrom,
  ) {
    onSaved({
      ...page,
      notifyPrefs: nextRows,
      notifyReminders: nextReminders.map((row) => ({
        minutes: toMinutes(row.value, row.unit),
      })),
      emailNotifyConfig: nextEmail,
      whatsappNotifyConfig: { sendFrom: nextWa },
    });
  }

  function tileOn(id: NotificationRow["id"]) {
    const row = rows.find((item) => item.id === id);
    if (!row || !channel) return false;
    const forAudience =
      audience === "customer" ? row.notifyContact : row.notifyUser;
    return row.channels[channel] && forAudience;
  }

  function toggleTile(id: NotificationRow["id"]) {
    if (!channel) return;
    const enabled = tileOn(id);
    persist(
      rows.map((row) => {
        if (row.id !== id) return row;
        const nextOn = !enabled;
        const otherStillOn =
          audience === "customer" ? row.notifyUser : row.notifyContact;
        return {
          ...row,
          channels: {
            ...row.channels,
            [channel]: nextOn || otherStillOn,
          },
          notifyContact: audience === "customer" ? nextOn : row.notifyContact,
          notifyUser: audience === "user" ? nextOn : row.notifyUser,
        };
      }),
    );
  }

  function patchEmailConfig(partial: Partial<typeof emailConfig>) {
    const next = { ...emailConfig, ...partial };
    setEmailConfig(next);
    persist(rows, reminders, next);
  }

  return (
    <div className="px-5 py-5 sm:px-6">
      <h2 className="text-[16px] font-semibold text-slate-900">
        {headingFor(panel)}
      </h2>

      {panel !== "calendar" ? (
        <>
          <div className="mt-4 flex gap-5 border-b border-slate-200 text-[13px] font-semibold">
            {(["customer", "user"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAudience(item)}
                className={cn(
                  "-mb-px border-b-2 pb-2",
                  audience === item
                    ? "border-[#5A32A3] text-[#5A32A3]"
                    : "border-transparent text-slate-500",
                )}
              >
                {item === "customer" ? "To Customer" : "To User"}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-semibold text-slate-800">
              Notifications
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {notifyBlurb(panel, who)}
            </p>
            <div ref={menuRef} className="mt-3 flex flex-wrap gap-3">
              {STAGE_TILES.map((tile, index) => {
                const Icon = tile.icon;
                const on = tileOn(tile.id);
                return (
                  <div key={tile.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleTile(tile.id)}
                      className={cn(
                        "flex h-[92px] w-[112px] flex-col items-center justify-center gap-2 rounded-xl border text-[12px] font-medium",
                        on
                          ? "border-[#5A32A3]/35 bg-[#F3ECFB] text-[#5A32A3]"
                          : "border-dashed border-slate-200 bg-white text-slate-400",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {tile.label}
                    </button>
                    {panel !== "whatsapp" ? (
                    <button
                      type="button"
                      aria-label={`${tile.label} options`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuId((current) =>
                          current === tile.id ? null : tile.id,
                        );
                      }}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/80 hover:text-slate-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    ) : null}
                    {menuId === tile.id ? (
                      <div
                        className={cn(
                          "absolute top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg",
                          index >= STAGE_TILES.length - 2 ? "right-0" : "left-0",
                        )}
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-[#F3ECFB]"
                          onClick={() => {
                            toggleTile(tile.id);
                            setMenuId(null);
                          }}
                        >
                          {on ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-[#F3ECFB]"
                          onClick={() => {
                            const row = rows.find((item) => item.id === tile.id);
                            if (row) setEditing(row);
                            setMenuId(null);
                          }}
                        >
                          Edit template
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[13px] font-semibold text-slate-800">Reminders</p>
            <p className="mt-1 text-[12px] text-slate-500">
              {reminderBlurb(panel, who)}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {reminders.map((reminder, index) => (
                <div key={`${reminder.unit}-${index}`}>
                  <p className="mb-1 text-[12px] text-slate-500">Before</p>
                  <div className="flex overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                    <input
                      type="number"
                      min={1}
                      value={reminder.value}
                      onChange={(e) => {
                        const next = [...reminders];
                        next[index] = {
                          ...reminder,
                          value: Math.max(1, Number(e.target.value) || 1),
                        };
                        setReminders(next);
                        persist(rows, next);
                      }}
                      className="h-10 w-16 px-2.5 text-[13px] outline-none"
                    />
                    <select
                      value={reminder.unit}
                      aria-label="Reminder unit"
                      onChange={(e) => {
                        const next = [...reminders];
                        next[index] = {
                          ...reminder,
                          unit: e.target.value as ReminderUnit,
                        };
                        setReminders(next);
                        persist(rows, next);
                      }}
                      className="h-10 appearance-none border-l border-[#E5E7EB] bg-white px-2 pr-7 text-[13px] text-slate-600 outline-none"
                      style={SELECT_BG}
                    >
                      {REMINDER_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {panel !== "whatsapp" ? (
              <button
                type="button"
                onClick={() => {
                  const next = [
                    ...reminders,
                    { value: 30, unit: "Minutes" as const },
                  ];
                  setReminders(next);
                  persist(rows, next);
                }}
                className="mb-1 text-[13px] font-semibold text-[#5A32A3] hover:underline"
              >
                + Add Reminders
              </button>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <CalendarInvitesEditor page={page} onSaved={onSaved} />
      )}

      {panel === "email" ? (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-slate-800">
            Email Configurations
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-slate-500">
                Send From
              </span>
              <select
                value={emailConfig.sendFrom}
                onChange={(e) => patchEmailConfig({ sendFrom: e.target.value })}
                className={SELECT_CLASS}
                style={SELECT_BG}
              >
                {!emailConfig.sendFrom && !actorEmail ? (
                  <option value="">Select send from</option>
                ) : null}
                {emailOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-slate-500">
                Reply To
              </span>
              <select
                value={emailConfig.replyTo}
                onChange={(e) => patchEmailConfig({ replyTo: e.target.value })}
                className={SELECT_CLASS}
                style={SELECT_BG}
              >
                <option value="">Select Reply To</option>
                {emailOptions.map((option) => (
                  <option key={`reply-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-slate-500">
                Copy(Cc)
              </span>
              <select
                value={emailConfig.cc}
                onChange={(e) => patchEmailConfig({ cc: e.target.value })}
                className={SELECT_CLASS}
                style={SELECT_BG}
              >
                <option value="">Select Copy (Cc)</option>
                {emailOptions.map((option) => (
                  <option key={`cc-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {panel === "whatsapp" ? (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-[13px] font-semibold text-slate-800">
              Whatsapp Number Configurations
            </p>
            <label className="mt-3 block max-w-xs">
              <span className="mb-1.5 block text-[12px] text-slate-500">
                Send from
              </span>
              <select
                value={waSendFrom}
                onChange={(e) => {
                  const next = e.target.value;
                  setWaSendFrom(next);
                  persist(rows, reminders, emailConfig, next);
                }}
                className={SELECT_CLASS}
                style={SELECT_BG}
              >
                <option value="">Select</option>
                {whatsappAccount().numbers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">
              WhatsApp Configurations
            </p>
            {!whatsappAccount().connected ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="flex items-start gap-2 text-[12px] text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  To send WhatsApp alerts, first integrate your Whatsapp Account.
                </p>
                <a
                  href="/settings/communication/whatsapp-business"
                  className="inline-flex h-8 items-center rounded-md border border-amber-300 bg-white px-3 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Integrate
                </a>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-emerald-700">
                WhatsApp Business is connected.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {panel === "sms" ? (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-slate-800">
            SMS Configurations
          </p>
          {!gatewayOn ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-start gap-2 text-[12px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                To send SMS alerts, first integrate an SMS gateway and enable it.
              </p>
              <a
                href="/settings/integrations/twilio"
                className="inline-flex h-8 items-center rounded-md border border-amber-300 bg-white px-3 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                Integrate
              </a>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-emerald-700">
              Twilio SMS is connected.
            </p>
          )}
        </div>
      ) : null}

      {editing ? (
        <NotificationEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            persist(rows.map((row) => (row.id === next.id ? next : row)));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
