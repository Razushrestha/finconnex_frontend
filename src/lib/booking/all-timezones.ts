/**
 * Every IANA time zone the browser knows, labelled with its current UTC
 * offset and ordered from UTC-12 to UTC+14, for time zone pickers.
 *
 * Offsets are read for "now", so a zone observing daylight saving shows its
 * current offset (Sydney is UTC+11:00 in October, UTC+10:00 in June).
 */

export type TimezoneOption = {
  /** The IANA name sent to the CRM, e.g. "Australia/Sydney". */
  value: string;
  /** "UTC+11:00 · Australia/Sydney" — offset first, so it survives truncation. */
  label: string;
  offsetMinutes: number;
};

/** Used only where Intl cannot list zones (very old browsers). */
const FALLBACK_ZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Africa/Cairo",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function isValidZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Minutes east of UTC for `tz` at `at`, e.g. 345 for Asia/Kathmandu. */
export function utcOffsetMinutes(tz: string, at: Date = new Date()): number {
  try {
    const name =
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
        .formatToParts(at)
        .find((part) => part.type === "timeZoneName")?.value ?? "";
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    if (!match) return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
    return match[1] === "-" ? -minutes : minutes;
  } catch {
    return 0;
  }
}

/** "UTC+05:45", "UTC-03:30", "UTC+00:00". */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/** IANA spells fixed offsets backwards: "Etc/GMT+12" is UTC-12. */
const FIXED_OFFSET = /^Etc\/GMT[+-]\d{1,2}$/;

/** One fixed-offset zone per whole hour, UTC-12 to UTC+14. */
const FIXED_OFFSET_ZONES = Array.from({ length: 27 }, (_, i) => i - 12)
  .filter((hours) => hours !== 0)
  .map((hours) => `Etc/GMT${hours > 0 ? "-" : "+"}${Math.abs(hours)}`);

export function timezoneOptionLabel(tz: string, at: Date = new Date()): string {
  const offset = formatUtcOffset(utcOffsetMinutes(tz, at));
  if (FIXED_OFFSET.test(tz)) return `${offset} · fixed offset`;
  return `${offset} · ${tz.replace(/_/g, " ")}`;
}

/**
 * Zones IANA has renamed. Chrome still lists several under the old name
 * ("Asia/Katmandu", "Asia/Calcutta"); the current one is shown wherever this
 * engine accepts it, so a Nepal guest sees Asia/Kathmandu, listed once.
 */
const RENAMED_ZONES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Ulan_Bator": "Asia/Ulaanbaatar",
  "Asia/Dacca": "Asia/Dhaka",
  "Asia/Thimbu": "Asia/Thimphu",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Godthab": "America/Nuuk",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Louisville": "America/Kentucky/Louisville",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Pacific/Truk": "Pacific/Chuuk",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Enderbury": "Pacific/Kanton",
};

/** The current name of a zone, when IANA renamed it and this engine knows both. */
export function currentZoneName(tz: string): string {
  const renamed = RENAMED_ZONES[tz];
  return renamed && isValidZone(renamed) ? renamed : tz;
}

function supportedZones(): string[] {
  try {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
    const zones = intl.supportedValuesOf?.("timeZone");
    if (zones?.length) return zones.map(currentZoneName);
  } catch {
    /* fall through */
  }
  return FALLBACK_ZONES;
}

let cached: { day: string; options: TimezoneOption[] } | null = null;

/**
 * All zones plus any `extra` (the page's or guest's zone, kept even when the
 * browser's list spells it differently), deduplicated and sorted by offset.
 */
export function allTimezoneOptions(
  extra: Array<string | null | undefined> = [],
  at: Date = new Date(),
): TimezoneOption[] {
  const day = at.toISOString().slice(0, 10);
  if (!cached || cached.day !== day) {
    const zones = new Set(["UTC", ...FIXED_OFFSET_ZONES, ...supportedZones()]);
    cached = {
      day,
      options: [...zones].map((value) => {
        const offsetMinutes = utcOffsetMinutes(value, at);
        return { value, offsetMinutes, label: timezoneOptionLabel(value, at) };
      }),
    };
  }
  const known = new Set(cached.options.map((row) => row.value));
  const added = [...new Set(extra.map((tz) => currentZoneName(tz?.trim() ?? "")))]
    .filter((tz) => tz && !known.has(tz) && isValidZone(tz))
    .map((value) => ({
      value,
      offsetMinutes: utcOffsetMinutes(value, at),
      label: timezoneOptionLabel(value, at),
    }));
  return [...cached.options, ...added].sort(
    (a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value),
  );
}
