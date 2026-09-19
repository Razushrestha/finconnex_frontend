"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hostsToConsultants,
  meetingToAppointment,
  replaceDashboardAppointments,
  replaceDashboardConsultants,
  type AppointmentStatus,
  type DashboardAppointment,
  type DashboardConsultant,
  type RelatedKind,
} from "@/lib/booking/dashboard";
import { listCrmMeetings } from "@/lib/meetings/api";
import { loadWorkspaceConsultants } from "@/lib/users/assignable";
import {
  listCrmBookings,
  listCrmConsultants,
  listCrmEventTypePages,
  mergeCrmEventTypePages,
  tryCrmBooking,
  type CrmBookingRecord,
} from "@/lib/booking/api";
import { listBookingPages, type BookingPage } from "@/lib/booking/types";

function bookingToAppointment(row: CrmBookingRecord): DashboardAppointment | null {
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
  return {
    id: row.id,
    guestName: row.guestName || "Guest",
    topic: row.guestEmail || "Consultation",
    relatedKind,
    relatedId,
    consultantId: row.hostId,
    start: row.startTime,
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
      const [meetingsResult, owners, crmBookings, crmHosts, crmPages] =
        await Promise.all([
          listCrmMeetings().catch(
            () => [] as Awaited<ReturnType<typeof listCrmMeetings>>,
          ),
          loadWorkspaceConsultants().catch(() => []),
          tryCrmBooking(() => listCrmBookings()),
          tryCrmBooking(() => listCrmConsultants()),
          tryCrmBooking(() => listCrmEventTypePages()),
        ]);
      if (!alive) return;
      const mappedMeetings = meetingsResult
        .map((meeting) => meetingToAppointment(meeting, owners))
        .filter((row): row is DashboardAppointment => !!row);
      const mappedBookings = (crmBookings ?? [])
        .map(bookingToAppointment)
        .filter((row): row is DashboardAppointment => !!row);
      const mapped = [...mappedBookings, ...mappedMeetings].filter(
        (row, index, list) => list.findIndex((item) => item.id === row.id) === index,
      );
      const memberPeople = owners.map((owner) => ({
        id: owner.id,
        name: owner.name,
        role: "Consultant",
      }));
      const hostPeople =
        crmHosts && crmHosts.length
          ? [
              ...memberPeople,
              ...crmHosts
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
        listBookingPages(),
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
