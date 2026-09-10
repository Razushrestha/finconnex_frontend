"use client";

import { useCallback, useEffect, useState } from "react";
import {
  calendlyEventTypeToBookingPage,
  listCalendlyEventTypes,
  listCalendlyHosts,
  type CalendlyHost,
} from "@/lib/booking/calendly-api";
import {
  hostsToConsultants,
  meetingToAppointment,
  replaceDashboardAppointments,
  replaceDashboardConsultants,
  type DashboardAppointment,
  type DashboardConsultant,
} from "@/lib/booking/dashboard";
import type { BookingPage } from "@/lib/booking/types";
import { listCrmMeetings } from "@/lib/meetings/api";

export function useCrmBooking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [consultants, setConsultants] = useState<DashboardConsultant[]>([]);
  const [hosts, setHosts] = useState<CalendlyHost[]>([]);
  const [pages, setPages] = useState<BookingPage[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      const [meetingsResult, hostRows, eventTypes] = await Promise.all([
        listCrmMeetings().catch(() => [] as Awaited<ReturnType<typeof listCrmMeetings>>),
        listCalendlyHosts().catch(() => [] as CalendlyHost[]),
        listCalendlyEventTypes().catch(() => []),
      ]);
      if (!alive) return;
      const mapped = meetingsResult
        .map((meeting) => meetingToAppointment(meeting, hostRows))
        .filter((row): row is DashboardAppointment => !!row);
      const consultantRows = hostsToConsultants(hostRows, mapped);
      const hostName = (id: string) =>
        hostRows.find((host) => host.id === id)?.name ?? "";
      const eventPages = eventTypes.map((item) =>
        calendlyEventTypeToBookingPage(item, hostName(item.hostId)),
      );
      replaceDashboardAppointments(mapped);
      replaceDashboardConsultants(consultantRows);
      setAppointments(mapped);
      setConsultants(consultantRows);
      setHosts(hostRows);
      setPages(eventPages);
      setError(null);
      setLoading(false);
    })().catch((err: unknown) => {
      if (!alive) return;
      replaceDashboardAppointments([]);
      replaceDashboardConsultants([]);
      setAppointments([]);
      setConsultants([]);
      setHosts([]);
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
    hosts,
    pages,
    refresh,
  };
}
