"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appointmentChannelFromLocation,
  appointmentChannelFromVia,
  appointmentPersonName,
  hostsToConsultants,
  appointmentsFromGuestClocks,
  guestClockDisplayRange,
  meetingToAppointment,
  resolveConsultantMatch,
  toLocalStart,
  parseAppointmentStart,
  replaceDashboardAppointments,
  replaceDashboardConsultants,
  type AppointmentStage,
  type AppointmentStatus,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
  setBookingDisplayZone,
} from "@/lib/booking/dashboard";
import { listCrmMeetings } from "@/lib/meetings/api";
import {
  assignGuestClocks,
  guestAppointmentNotes,
  type GuestClock,
} from "@/lib/meetings/appointment-manage";
import { loadWorkspaceConsultants } from "@/lib/users/assignable";
import { listCrmUsers } from "@/lib/settings/users-store";
import {
  dropBookingMeetings,
  listCrmBookings,
  listCrmBookingHosts,
  listCrmConsultants,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  tryCrmBooking,
  type CrmBookingRecord,
} from "@/lib/booking/api";
import {
  listBookingPages,
  listBookings,
  type BookingPage,
} from "@/lib/booking/types";
import { eventTypeInitials } from "@/lib/booking/new-appointment";
import { loadCrmContacts } from "@/lib/contacts/api";
import { fetchLeadList } from "@/lib/leads/api/client";
import type { CrmLead } from "@/lib/leads/api/types";
import { getRulesActor } from "@/lib/rules/actor";
import { loadSettingsValues } from "@/lib/settings/settings-store";

const BOOKING_CODE_STORE = "booking:list-codes:v1";

function rememberBookingCode(id: string, eventName: string) {
  if (typeof window === "undefined") return eventTypeInitials(eventName);
  let store: Record<string, string> = {};
  try {
    const raw = window.localStorage.getItem(BOOKING_CODE_STORE);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      store = parsed as Record<string, string>;
    }
  } catch {
    store = {};
  }
  if (store[id]) return store[id];
  const prefix = eventTypeInitials(eventName || "Booking");
  const taken = new Set(Object.values(store));
  let n = 1;
  let code = `${prefix}-${String(n).padStart(5, "0")}`;
  while (taken.has(code)) {
    n += 1;
    code = `${prefix}-${String(n).padStart(5, "0")}`;
  }
  store[id] = code;
  try {
    window.localStorage.setItem(BOOKING_CODE_STORE, JSON.stringify(store));
  } catch {
    /* the code is still shown for this visit */
  }
  return code;
}

function textField(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function numberField(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim() && Number(value) > 0) return Number(value);
  }
  return undefined;
}

function bookingListFields(raw: Record<string, unknown>) {
  const event =
    raw.eventType && typeof raw.eventType === "object"
      ? (raw.eventType as Record<string, unknown>)
      : {};
  const payment = textField(raw, "paymentStatus", "payment_status", "payment");
  return {
    bookingCode:
      textField(raw, "reference", "bookingNumber", "booking_number", "code") ||
      undefined,
    eventTypeName:
      textField(raw, "eventTypeName", "event_type_name") ||
      textField(event, "name", "title") ||
      undefined,
    price:
      numberField(raw, "price", "amount", "total") ??
      numberField(event, "price", "amount"),
    currency: textField(raw, "currency") || textField(event, "currency") || undefined,
    paymentStatus: payment
      ? /unpaid|due|pending/i.test(payment)
        ? "Due"
        : /paid/i.test(payment)
          ? "Paid"
          : payment
      : undefined,
    phone:
      textField(raw, "guestPhone", "guest_phone", "phone", "contactNumber", "contact_number") ||
      undefined,
    notes: textField(raw, "notes", "note", "internalNotes") || undefined,
    bookedOn:
      textField(raw, "createdAt", "created_at", "bookedAt", "booked_at") || undefined,
  };
}

function withListDetails(
  row: DashboardAppointment,
  pages: BookingPage[],
  saved: ReturnType<typeof listBookings>,
): DashboardAppointment {
  const local = saved.find(
    (item) =>
      item.crmBookingId === row.id ||
      item.crmMeetingId === row.id ||
      item.meetingId === row.id ||
      item.id === row.id,
  );
  const page =
    pages.find(
      (item) =>
        item.id === row.eventTypeId || item.crmEventTypeId === row.eventTypeId,
    ) ||
    (local ? pages.find((item) => item.id === local.pageId) : undefined) ||
    (row.eventTypeName
      ? pages.find((item) => item.title === row.eventTypeName)
      : undefined);
  const price = row.price ?? page?.price;
  const start = parseAppointmentStart(row.start);
  const durationMs = (page?.durationMinutes || 30) * 60_000;
  const end =
    row.end ||
    (local?.end ? toLocalStart(local.end) : undefined) ||
    (Number.isNaN(start.getTime())
      ? undefined
      : toLocalStart(new Date(start.getTime() + durationMs).toISOString()));
  const eventName = row.eventTypeName || page?.title || row.type;
  const amount = price && price > 0 ? price : undefined;
  return {
    ...row,
    bookingCode:
      row.bookingCode ||
      local?.reference ||
      rememberBookingCode(row.id, eventName),
    eventTypeName: eventName,
    end,
    price: amount,
    currency: row.currency || page?.currency,
    channel:
      row.recordKind === "meeting" || row.channelFromBooking
        ? row.channel
        : appointmentChannelFromVia(page?.meetingVia) ?? row.channel,
    paymentStatus: row.paymentStatus || (amount ? "Due" : "Free"),
    phone: row.phone || local?.guestPhone,
    notes: row.notes,
    bookedOn: row.bookedOn || local?.createdAt,
  };
}

const HIDDEN_APPOINTMENTS_KEY = "booking:hidden-appointments:v1";

export function hiddenAppointmentIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = JSON.parse(window.localStorage.getItem(HIDDEN_APPOINTMENTS_KEY) || "[]");
    return new Set(
      Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && !!item) : [],
    );
  } catch {
    return new Set<string>();
  }
}

export function hideAppointments(ids: Array<string | undefined>) {
  const next = hiddenAppointmentIds();
  for (const id of ids) {
    if (id) next.add(id);
  }
  window.localStorage.setItem(HIDDEN_APPOINTMENTS_KEY, JSON.stringify([...next]));
}

function visibleAppointments(rows: DashboardAppointment[]) {
  const hidden = hiddenAppointmentIds();
  if (!hidden.size) return rows;
  return rows.filter(
    (row) => !hidden.has(row.id) && !(row.meetingId && hidden.has(row.meetingId)),
  );
}

function rowsWithGuestClocks(rows: DashboardAppointment[], clocks: GuestClock[]) {
  const { assigned, unused } = assignGuestClocks(
    rows.map((row) => ({
      id: row.id,
      meetingId: row.meetingId,
      title: row.eventTypeName || row.topic,
      guestName: row.guestName,
      hostName: row.consultantName,
      start: row.start,
    })),
    clocks,
  );
  const next = rows.flatMap((row, index) => {
    const clock = assigned[index];
    if (!clock) return [row];
    if (clock.status === "deleted") {
      const sameId =
        !!clock.meetingId &&
        (clock.meetingId === row.meetingId || clock.meetingId === row.id);
      return sameId ? [] : [row];
    }
    const range = guestClockDisplayRange(clock);
    const notes = guestAppointmentNotes(row.notes, clock.remarks);
    return [
      {
        ...row,
        start: range.start,
        end: range.end,
        notes,
        status:
          clock.status === "cancelled"
            ? ("Cancelled" as const)
            : clock.status === "scheduled"
              ? ("Scheduled" as const)
              : row.status,
      },
    ];
  });
  const added = appointmentsFromGuestClocks(unused.filter((clock) => clock.status === "cancelled"));
  return [...next, ...added];
}

function samePerson(left: string, right: string) {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  return !!a && a === b;
}

function fillCustomerRecord(
  row: DashboardAppointment,
  contacts: Awaited<ReturnType<typeof loadCrmContacts>>,
  leads: CrmLead[],
): DashboardAppointment {
  const email = row.topic.includes("@") ? row.topic.trim().toLowerCase() : "";
  const contact = contacts.find((item) => {
    const person = item.contact;
    return (
      person.id === row.relatedId ||
      (email && person.email.trim().toLowerCase() === email) ||
      samePerson(person.name, row.guestName)
    );
  })?.contact;
  const lead = leads.find((item) => {
    const name = `${item.firstName} ${item.lastName}`.trim();
    return (
      item.id === row.relatedId ||
      (email && item.email.trim().toLowerCase() === email) ||
      samePerson(name, row.guestName)
    );
  });
  const phone =
    row.phone ||
    contact?.mobile ||
    contact?.phone ||
    lead?.mobilePhone ||
    lead?.phone ||
    undefined;
  const notes = row.notes || contact?.notes || lead?.notes || lead?.description || undefined;
  const leadName = lead ? `${lead.firstName} ${lead.lastName}`.trim() : "";
  const relatedName =
    row.relatedName ||
    contact?.name ||
    leadName ||
    (row.guestName && row.guestName !== "Guest" ? row.guestName : "");
  return {
    ...row,
    phone: phone || undefined,
    notes: notes || undefined,
    relatedName: relatedName || undefined,
  };
}

function bookingChannel(row: CrmBookingRecord): {
  channel: ReturnType<typeof appointmentChannelFromLocation>;
  channelFromBooking: boolean;
} {
  const event =
    row.raw.eventType && typeof row.raw.eventType === "object"
      ? (row.raw.eventType as Record<string, unknown>)
      : {};
  const own = textField(
    row.raw,
    "locationType",
    "location_type",
    "meetingType",
    "channel",
    "location",
  );
  return {
    channel: appointmentChannelFromLocation(
      own,
      textField(event, "locationType", "location_type", "location"),
    ),
    channelFromBooking: !!own,
  };
}

function bookingToAppointment(
  row: CrmBookingRecord,
  people: { id: string; name: string; email?: string }[],
  hosts: { id: string; name: string; crmUserId?: string; email?: string }[],
): DashboardAppointment | null {
  const statusRaw = row.status.toLowerCase();
  // RESCHEDULED is the superseded booking; its replacement is listed separately.
  if (statusRaw.includes("resched")) return null;
  const completed = statusRaw.includes("complete");
  const noShow =
    /no[-_ ]?show/.test(statusRaw) || !!textField(row.raw, "noShowAt", "no_show_at");
  const status: AppointmentStatus = statusRaw.includes("cancel")
    ? "Cancelled"
    : statusRaw.includes("confirm") || completed
    ? "Confirmed"
    : noShow
      ? "Pending"
      : "Scheduled";
  const stage: AppointmentStage | undefined = noShow
    ? "No Show"
    : completed
      ? "Completed"
      : textField(row.raw, "rescheduledFromId", "rescheduled_from_id")
        ? "Rescheduled"
        : undefined;
  const relatedKind: RelatedKind = row.leadId
    ? "Lead"
    : row.dealId
      ? "Deal"
      : row.companyId
        ? "Company"
        : "Contact";
  const relatedId = row.leadId || row.dealId || row.companyId || row.contactId || "—";
  const guestName =
    appointmentPersonName(
      row.guestName,
      typeof row.raw.title === "string" ? row.raw.title : undefined,
      typeof row.raw.eventTypeName === "string" ? row.raw.eventTypeName : undefined,
    ) || "Guest";
  const bookingHost = hosts.find(
    (host) =>
      host.id === row.hostId ||
      (row.hostUserId && host.crmUserId === row.hostUserId) ||
      (row.hostName && host.name === row.hostName),
  );
  const matched = resolveConsultantMatch(
    [
      row.hostUserId,
      bookingHost?.crmUserId,
      bookingHost?.id,
      bookingHost?.name,
      bookingHost?.email,
      row.hostName,
      row.hostId,
    ],
    people,
  );
  const extras = bookingListFields(row.raw);
  return {
    id: row.id,
    guestName,
    topic: row.guestEmail || guestName,
    relatedKind,
    relatedId,
    eventTypeId: row.eventTypeId || undefined,
    end: row.endTime ? toLocalStart(row.endTime) : undefined,
    bookingCode: extras.bookingCode,
    eventTypeName: extras.eventTypeName,
    price: extras.price,
    currency: extras.currency,
    paymentStatus: extras.paymentStatus,
    phone: extras.phone,
    notes: extras.notes,
    bookedOn: extras.bookedOn,
    createdBy:
      matched?.name || bookingHost?.name || row.hostName || undefined,
    consultantId:
      matched?.id ||
      bookingHost?.crmUserId ||
      bookingHost?.name ||
      row.hostName ||
      row.hostUserId ||
      "",
    consultantName:
      matched?.name ||
      bookingHost?.name ||
      row.hostName ||
      "",
    start: toLocalStart(row.startTime),
    type: "Consultation",
    status,
    stage,
    recordKind: "booking",
    meetingId: row.meetingId,
    ...bookingChannel(row),
    avatarClass: "bg-violet-100 text-violet-800",
  };
}

/**
 * The zone the booking screens show times in: the signed-in user's own.
 * Their host record (by user id or email, then by name), else the time zone
 * set in My preferences, else the zone every host in the workspace shares.
 * Null leaves this browser's zone.
 */
export function bookingDisplayZoneFor(
  hosts: { name: string; crmUserId?: string; email?: string; timezone?: string }[],
  actor: { id?: string; email?: string; name?: string },
  profileZone: unknown = loadSettingsValues("my-preferences/profile").timezone,
): { zone: string | null; from: string } {
  const email = actor.email?.trim().toLowerCase() ?? "";
  const name = actor.name?.trim().toLowerCase() ?? "";
  const me =
    hosts.find(
      (host) =>
        (!!actor.id && host.crmUserId === actor.id) ||
        (!!email && host.email?.trim().toLowerCase() === email),
    ) ??
    (name ? hosts.find((host) => host.name.trim().toLowerCase() === name) : undefined);
  if (me?.timezone) return { zone: me.timezone, from: "your host profile" };
  if (typeof profileZone === "string" && profileZone.trim()) {
    return { zone: profileZone.trim(), from: "My preferences" };
  }
  const zones = [...new Set(hosts.map((host) => host.timezone).filter(Boolean))];
  if (zones.length === 1) return { zone: zones[0]!, from: "the workspace's hosts" };
  return { zone: null, from: "no host or preference zone found" };
}

export function useCrmBooking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [consultants, setConsultants] = useState<DashboardConsultant[]>([]);
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      let meetingsUnavailable = false;
      const [meetingsResult, owners, crmBookings, crmHosts, crmConsultants, crmPages] =
        await Promise.all([
          listCrmMeetings().catch(() => {
            meetingsUnavailable = true;
            return [] as Awaited<ReturnType<typeof listCrmMeetings>>;
          }),
          loadWorkspaceConsultants().catch(() => []),
          tryCrmBooking(() => listCrmBookings()),
          tryCrmBooking(() => listCrmBookingHosts()),
          tryCrmBooking(() => listCrmConsultants()),
          tryCrmBooking(() => listCrmEventTypePages()),
        ]);
      if (!alive) return;
      const actor = getRulesActor();
      const hosts = [...(crmHosts ?? []), ...(crmConsultants ?? [])].filter(
        (host, index, list) => list.findIndex((item) => item.id === host.id) === index,
      );
      // The signed-in host's own zone is the clock these screens read times
      // on; set before any booking below is converted.
      const zone = bookingDisplayZoneFor(crmHosts ?? [], actor);
      setBookingDisplayZone(zone.zone);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[booking] showing times in ${zone.zone ?? "this browser's zone"} (${zone.from})`);
      }
      const people = [
        ...(actor.id || actor.name || actor.email
          ? [
              {
                id: actor.id || actor.email || actor.name,
                name: actor.name || actor.email || "You",
                email: actor.email,
              },
            ]
          : []),
        ...owners,
        ...listCrmUsers()
          .filter((user) => user.status !== "Inactive")
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          })),
        ...hosts.flatMap((host) => {
          const rows = [{ id: host.id, name: host.name, email: host.email }];
          if (host.crmUserId && host.crmUserId !== host.id) {
            rows.push({
              id: host.crmUserId,
              name: host.name,
              email: host.email,
            });
          }
          return rows;
        }),
      ];
      // Each booking has a backend-made meeting twin; show the appointment once.
      const mappedMeetings = dropBookingMeetings(meetingsResult, crmBookings ?? [])
        .map((meeting) => meetingToAppointment(meeting, people))
        .filter((row): row is DashboardAppointment => !!row);
      const mappedBookings = (crmBookings ?? [])
        .map((row) => bookingToAppointment(row, people, hosts))
        .filter((row): row is DashboardAppointment => !!row);
      const mapped = [...mappedBookings, ...mappedMeetings]
        .map((row) => {
          if (row.consultantName) return row;
          const hit = people.find(
            (person) =>
              person.id === row.consultantId ||
              person.name === row.consultantId ||
              (person.email && person.email === row.consultantId),
          );
          return hit ? { ...row, consultantName: hit.name } : row;
        })
        .filter(
          (row, index, list) => list.findIndex((item) => item.id === row.id) === index,
        );
      // `owners` already holds every activated consultant, hosts included;
      // a host who is not among them (invited, deactivated, or never signed
      // in) is not listed.
      const hostPeople = owners.map((owner) => {
        const email = owner.email.trim().toLowerCase();
        const host = hosts.find(
          (row) =>
            (row.crmUserId || row.id) === owner.id ||
            (!!email && row.email?.trim().toLowerCase() === email),
        );
        return {
          id: owner.id,
          name: owner.name,
          role: host?.isHomeConsultant ? "Home consultant" : "Consultant",
        };
      });
      const eventPages = mergeCrmEventTypePages(
        listBookingPages().filter((page) => page.eventType === "Consultation"),
        crmPages ?? [],
      );
      const saved = listBookings();
      const [contactRows, leadRows] = await Promise.all([
        loadCrmContacts({ page: 1, limit: 100 }).catch(() => []),
        fetchLeadList({ page: 1, limit: 100 }).catch(() => [] as CrmLead[]),
      ]);
      const clocks = await fetch("/api/appointment/manage", {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (res) => (res.ok ? ((await res.json()) as GuestClock[]) : []))
        .catch(() => [] as GuestClock[]);
      const listed = visibleAppointments(
        (
          meetingsUnavailable ? appointmentsFromGuestClocks(clocks) : rowsWithGuestClocks(mapped, clocks)
        )
          .map((row) => withListDetails(row, eventPages, saved))
          .map((row) => fillCustomerRecord(row, contactRows, leadRows)),
      );
      if (!meetingsUnavailable) {
        void fetch("/api/appointment/manage/apply", {
          method: "POST",
          credentials: "include",
        }).catch(() => undefined);
      }
      const consultantRows = hostsToConsultants(
        hostPeople,
        listed.filter((row) => row.stage !== "Completed"),
      );
      replaceDashboardAppointments(listed);
      replaceDashboardConsultants(consultantRows);
      setAppointments(listed);
      setConsultants(consultantRows);
      setPages(eventPages);
      setError(null);
      setLoading(false);
    })().catch((err: unknown) => {
      if (!alive) return;
      replaceDashboardAppointments([]);
      replaceDashboardConsultants([]);
      setAppointments([]);
      setConsultants([]);
      setPages([]);
      setError(err instanceof Error ? err.message : "Booking APIs unavailable");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  useEffect(() => {
    let stopped = false;
    let pulling = false;
    async function pullInternal() {
      if (stopped || pulling || document.visibilityState === "hidden") return;
      pulling = true;
      try {
        const clocks = await fetch("/api/appointment/manage", {
          credentials: "include",
          cache: "no-store",
        })
          .then(async (res) => (res.ok ? ((await res.json()) as GuestClock[]) : []))
          .catch(() => [] as GuestClock[]);
        const current = appointmentsRef.current;
        if (stopped || !current.length || !clocks.length) return;
        const next = visibleAppointments(rowsWithGuestClocks(current, clocks));
        const stamp = (rows: DashboardAppointment[]) =>
          rows
            .map((row) => `${row.id}|${row.start}|${row.end ?? ""}|${row.status}|${row.notes ?? ""}`)
            .join("\n");
        if (stamp(next) === stamp(current)) return;
        replaceDashboardAppointments(next);
        setAppointments(next);
      } finally {
        pulling = false;
      }
    }
    void pullInternal();
    const timer = window.setInterval(() => void pullInternal(), 200);
    document.addEventListener("visibilitychange", pullInternal);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pullInternal);
    };
  }, []);

  return {
    loading,
    error,
    appointments,
    consultants,
    pages,
    refresh,
  };
}
