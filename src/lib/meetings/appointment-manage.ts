import { ianaTimezoneFromLabel } from "@/lib/booking/timezones";

export type AppointmentManageRecord = {
  token: string;
  meetingId?: string;
  title: string;
  guestName: string;
  hostName: string;
  dateIso: string;
  startHHmm: string;
  durationMinutes: number;
  timeZone: string;
  reference: string;
  status: "scheduled" | "cancelled" | "deleted";
  remarks?: string;
  /** Set after the CRM has accepted this version, so the dashboard does not send it again. */
  crmSyncedAt?: string;
  updatedAt: string;
};

export function appointmentReference(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return `AP-${String((hash % 90000) + 10000)}`;
}

export function formatDurationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours} hr ${mins} mins`;
  if (hours === 1) return "1 hr";
  if (hours) return `${hours} hr`;
  return `${mins} mins`;
}

/** 11:30–16:30 in 15-minute steps, as HH:mm. */
export function appointmentSlotTimes() {
  const slots: string[] = [];
  for (let minutes = 11 * 60 + 30; minutes <= 16 * 60 + 30; minutes += 15) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  }
  return slots;
}

export function slotPeriod(hhmm: string) {
  const hour = Number(hhmm.slice(0, 2));
  if (hour < 12) return "Morning";
  if (hour < 16) return "Afternoon";
  return "Evening";
}

export function formatSlotClock(hhmm: string) {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = minuteRaw ?? "00";
  if (!Number.isFinite(hour)) return hhmm;
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${suffix}`;
}

export function formatAppointmentStamp(dateIso: string, hhmm: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  if (!year || !month || !day) return dateIso;
  const date = new Date(year, month - 1, day);
  const label = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
  return `${label} | ${formatSlotClock(hhmm)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** Wall-clock range the dashboard should show, without shifting it into another timezone. */
export function guestClockRange(dateIso: string, startHHmm: string, durationMinutes: number) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = startHHmm.split(":").map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
  const end = new Date(start.getTime() + Math.max(0, durationMinutes) * 60_000);
  const stamp = (date: Date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return { start: stamp(start), end: stamp(end) };
}

export type GuestClock = {
  token?: string;
  meetingId?: string;
  title: string;
  guestName?: string;
  hostName?: string;
  reference?: string;
  dateIso: string;
  startHHmm: string;
  durationMinutes: number;
  updatedAt: string;
  status: string;
  remarks?: string;
};

/** A staff reschedule puts a cancelled appointment back on the books at the new time. */
export function reopenGuestRecord(
  record: AppointmentManageRecord,
  next: { dateIso: string; startHHmm: string; durationMinutes?: number; updatedAt?: string },
): AppointmentManageRecord {
  const { remarks: _remarks, crmSyncedAt: _synced, ...rest } = record;
  return {
    ...rest,
    status: "scheduled",
    dateIso: next.dateIso,
    startHHmm: next.startHHmm,
    durationMinutes: next.durationMinutes || record.durationMinutes,
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
}

/** Notes the dashboard should show, including the client's cancel remarks. */
export function guestAppointmentNotes(existing?: string, remarks?: string) {
  const note = existing?.trim() ?? "";
  const remark = remarks?.trim() ?? "";
  if (note && remark && note !== remark) return `${note}\n${remark}`;
  return remark || note || undefined;
}

/** The saved client choice for this dashboard row. */
export function matchGuestClock(
  clocks: GuestClock[],
  row: {
    id?: string;
    meetingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    start?: string;
  },
) {
  const byMeeting = clocks.find(
    (item) =>
      !!item.meetingId &&
      (item.meetingId === row.meetingId || item.meetingId === row.id),
  );
  if (byMeeting) return byMeeting;
  const title = (row.title ?? "").trim().toLowerCase();
  const guest = (row.guestName ?? "").trim().toLowerCase();
  const host = (row.hostName ?? "").trim().toLowerCase();
  const start = (row.start ?? "").slice(0, 16);
  const same = (value: string | undefined, expected: string) =>
    !!expected && (value ?? "").trim().toLowerCase() === expected;
  const ranked = clocks
    .map((item) => {
      const guestHit = same(item.guestName, guest);
      const hostHit = same(item.hostName, host);
      const titleHit = same(item.title, title);
      const clockStart = guestClockRange(
        item.dateIso,
        item.startHHmm,
        item.durationMinutes,
      ).start.slice(0, 16);
      const startHit = !!start && start === clockStart;
      let score = 0;
      if (guestHit && startHit) score = 5;
      else if (guestHit && hostHit) score = 3;
      else if (guestHit && titleHit) score = 2;
      else if (!guest && titleHit) score = 1;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.updatedAt < b.item.updatedAt ? 1 : -1));
  return ranked[0]?.item;
}

function guestClockScore(
  clock: GuestClock,
  row: {
    id?: string;
    meetingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    start?: string;
  },
) {
  if (
    !!clock.meetingId &&
    (clock.meetingId === row.meetingId || clock.meetingId === row.id)
  ) {
    return 10;
  }
  const same = (value: string | undefined, expected: string) =>
    !!expected && (value ?? "").trim().toLowerCase() === expected;
  const guest = (row.guestName ?? "").trim().toLowerCase();
  const host = (row.hostName ?? "").trim().toLowerCase();
  const title = (row.title ?? "").trim().toLowerCase();
  const start = (row.start ?? "").slice(0, 16);
  const clockStart = guestClockRange(clock.dateIso, clock.startHHmm, clock.durationMinutes).start.slice(0, 16);
  const guestHit = same(clock.guestName, guest);
  const hostHit = same(clock.hostName, host);
  const titleHit = same(clock.title, title);
  if (guestHit && start && start === clockStart) return 5;
  if (guestHit && hostHit) return 3;
  if (guestHit && titleHit) return 2;
  if (!guest && titleHit) return 1;
  return 0;
}

/** Gives each dashboard row its own saved appointment, leaving the rest unused. */
export function assignGuestClocks<
  T extends {
    id?: string;
    meetingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    start?: string;
  },
>(rows: T[], clocks: GuestClock[]) {
  const assigned: Array<GuestClock | undefined> = rows.map(() => undefined);
  const usedRows = new Set<number>();
  const usedClocks = new Set<GuestClock>();
  const pairs = rows.flatMap((row, index) =>
    clocks
      .map((clock) => ({ index, clock, score: guestClockScore(clock, row) }))
      .filter((pair) => pair.score > 0),
  );
  pairs.sort(
    (a, b) => b.score - a.score || (a.clock.updatedAt < b.clock.updatedAt ? 1 : -1),
  );
  for (const pair of pairs) {
    if (usedRows.has(pair.index) || usedClocks.has(pair.clock)) continue;
    assigned[pair.index] = pair.clock;
    usedRows.add(pair.index);
    usedClocks.add(pair.clock);
  }
  return { assigned, unused: clocks.filter((clock) => !usedClocks.has(clock)) };
}

/** True when this saved appointment is the one the staff member just deleted. */
export function appointmentDeleteMatch(
  record: {
    token?: string;
    meetingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    dateIso?: string;
    startHHmm?: string;
  },
  target: {
    ids?: string[];
    title?: string;
    guestName?: string;
    hostName?: string;
    start?: string;
  },
) {
  const ids = new Set(
    (target.ids ?? []).map((id) => id.trim()).filter((id) => id.length > 0),
  );
  if (record.meetingId && ids.has(record.meetingId)) return true;
  if (record.token && ids.has(record.token)) return true;
  const title = (target.title ?? "").trim().toLowerCase();
  const recordTitle = (record.title ?? "").trim().toLowerCase();
  if (!title || title !== recordTitle) return false;
  const guest = (target.guestName ?? "").trim().toLowerCase();
  const recordGuest = (record.guestName ?? "").trim().toLowerCase();
  if (!guest || guest !== recordGuest) return false;
  const host = (target.hostName ?? "").trim().toLowerCase();
  const recordHost = (record.hostName ?? "").trim().toLowerCase();
  if (host && recordHost && host !== recordHost) return false;
  const start = (target.start ?? "").slice(0, 16);
  if (start && record.dateIso && record.startHHmm) {
    const clock = `${record.dateIso}T${record.startHHmm}`.slice(0, 16);
    if (clock !== start) return false;
  }
  return true;
}

/** One row per meeting, keeping the client's latest choice. */
export function latestGuestClocks<T extends GuestClock>(records: T[]) {
  const latest = new Map<string, T>();
  for (const record of records) {
    const key = isAppointmentMeetingId(record.meetingId)
      ? record.meetingId!
      : `title:${record.title.trim().toLowerCase()}`;
    const prev = latest.get(key);
    if (!prev || record.updatedAt > prev.updatedAt) latest.set(key, record);
  }
  return [...latest.values()];
}

export function normalizeTimeZone(label?: string) {
  return ianaTimezoneFromLabel(label);
}

export function isAppointmentMeetingId(value?: string) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

/** Uses the stored meeting id, or the only CRM meeting with the same title. */
export function matchAppointmentMeetingId(
  record: { meetingId?: string; title: string },
  meetings: Array<{ id: string; title: string }>,
) {
  if (isAppointmentMeetingId(record.meetingId)) return record.meetingId;
  const title = record.title.trim().toLowerCase();
  if (!title) return undefined;
  const hits = meetings.filter(
    (meeting) =>
      isAppointmentMeetingId(meeting.id) &&
      meeting.title.trim().toLowerCase() === title,
  );
  return hits.length === 1 ? hits[0].id : undefined;
}
