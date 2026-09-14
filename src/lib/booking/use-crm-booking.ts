"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hostsToConsultants,
  meetingToAppointment,
  replaceDashboardAppointments,
  replaceDashboardConsultants,
  type DashboardAppointment,
  type DashboardConsultant,
} from "@/lib/booking/dashboard";
import { listBookingPages, type BookingPage } from "@/lib/booking/types";
import { listCrmMeetings } from "@/lib/meetings/api";
import { loadAssignableOwners } from "@/lib/users/assignable";

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
      const [meetingsResult, owners] = await Promise.all([
        listCrmMeetings().catch(
          () => [] as Awaited<ReturnType<typeof listCrmMeetings>>,
        ),
        loadAssignableOwners().catch(() => []),
      ]);
      if (!alive) return;
      const mapped = meetingsResult
        .map((meeting) => meetingToAppointment(meeting, owners))
        .filter((row): row is DashboardAppointment => !!row);
      const consultantRows = hostsToConsultants(
        owners.map((owner) => ({
          id: owner.id,
          name: owner.name,
          role: "Consultant",
        })),
        mapped,
      );
      const eventPages = listBookingPages();
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
