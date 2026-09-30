"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appointmentPersonName,
  hostsToConsultants,
  meetingToAppointment,
  resolveConsultantMatch,
  toLocalStart,
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
  listCrmBookings,
  listCrmBookingHosts,
  listCrmConsultants,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  tryCrmBooking,
  type CrmBookingRecord,
} from "@/lib/booking/api";
import { listBookingPages, type BookingPage } from "@/lib/booking/types";
import { getRulesActor } from "@/lib/rules/actor";

function bookingToAppointment(
  row: CrmBookingRecord,
  people: { id: string; name: string; email?: string }[],
  hosts: { id: string; name: string; crmUserId?: string; email?: string }[],
): DashboardAppointment | null {
  const statusRaw = row.status.toLowerCase();
  if (statusRaw.includes("cancel") || statusRaw.includes("complete")) return null;
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
  return {
    id: row.id,
    guestName,
    topic: row.guestEmail || guestName,
    relatedKind,
    relatedId,
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
    channel: "Video Call",
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
      const mappedMeetings = meetingsResult
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
      const consultantRows = hostsToConsultants(hostPeople, mapped);
      const eventPages = mergeCrmEventTypePages(
        listBookingPages().filter((page) => page.eventType === "Consultation"),
        crmPages ?? [],
      );
      replaceDashboardAppointments(mapped);
      replaceDashboardConsultants(consultantRows);
      setAppointments(mapped);
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
