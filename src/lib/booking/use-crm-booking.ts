"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appointmentChannelFromLocation,
  appointmentChannelFromVia,
  appointmentPersonName,
  hostsToConsultants,
  meetingToAppointment,
  resolveConsultantMatch,
  toLocalStart,
  parseAppointmentStart,
  replaceDashboardAppointments,
  replaceDashboardConsultants,
  type AppointmentStatus,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
} from "@/lib/booking/dashboard";
import { listCrmMeetings } from "@/lib/meetings/api";
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
  if (
    statusRaw.includes("cancel") ||
    statusRaw.includes("complete") ||
    statusRaw.includes("resched")
  ) {
    return null;
  }
  const status: AppointmentStatus = statusRaw.includes("confirm")
    ? "Confirmed"
    : statusRaw.includes("no-show") || statusRaw.includes("noshow")
      ? "Pending"
      : "Scheduled";
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
    recordKind: "booking",
    meetingId: row.meetingId,
    ...bookingChannel(row),
    avatarClass: "bg-violet-100 text-violet-800",
  };
}

export function useCrmBooking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [consultants, setConsultants] = useState<DashboardConsultant[]>([]);
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      const [meetingsResult, owners, crmBookings, crmHosts, crmConsultants, crmPages] =
        await Promise.all([
          listCrmMeetings().catch(
            () => [] as Awaited<ReturnType<typeof listCrmMeetings>>,
          ),
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
      const memberPeople = owners.map((owner) => ({
        id: owner.id,
        name: owner.name,
        role: "Consultant",
      }));
      const hostPeople =
        hosts.length
          ? [
              ...memberPeople,
              ...hosts
                .filter(
                  (host) =>
                    !memberPeople.some(
                      (person) =>
                        person.id === (host.crmUserId || host.id) ||
                        person.name === host.name,
                    ),
                )
                .map((host) => ({
                  id: host.crmUserId || host.id,
                  name: host.name,
                  role: host.isHomeConsultant ? "Home consultant" : "Consultant",
                })),
            ]
          : memberPeople;
      const eventPages = mergeCrmEventTypePages(
        listBookingPages().filter((page) => page.eventType === "Consultation"),
        crmPages ?? [],
      );
      const saved = listBookings();
      const [contactRows, leadRows] = await Promise.all([
        loadCrmContacts({ page: 1, limit: 100 }).catch(() => []),
        fetchLeadList({ page: 1, limit: 100 }).catch(() => [] as CrmLead[]),
      ]);
      const listed = mapped
        .map((row) => withListDetails(row, eventPages, saved))
        .map((row) => fillCustomerRecord(row, contactRows, leadRows));
      const consultantRows = hostsToConsultants(hostPeople, listed);
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

  return {
    loading,
    error,
    appointments,
    consultants,
    pages,
    refresh,
  };
}
