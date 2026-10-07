/** Common CRM timezone list (GHL / HubSpot style). */
export const WORLD_TIMEZONES = [
  "GMT-12:00 International Date Line West",
  "GMT-11:00 Midway Island, Samoa (SST)",
  "GMT-10:00 Hawaii (HST)",
  "GMT-09:00 Alaska (AKST)",
  "GMT-08:00 Pacific Time (US & Canada) (PST)",
  "GMT-08:00 Tijuana (PST)",
  "GMT-07:00 Arizona (MST)",
  "GMT-07:00 Mountain Time (US & Canada) (MST)",
  "GMT-07:00 Chihuahua, La Paz, Mazatlan (MST)",
  "GMT-06:00 Central Time (US & Canada) (CST)",
  "GMT-06:00 Central America (CST)",
  "GMT-06:00 Guadalajara, Mexico City, Monterrey (CST)",
  "GMT-06:00 Saskatchewan (CST)",
  "GMT-05:00 Eastern Time (US & Canada) (EST)",
  "GMT-05:00 Indiana (East) (EST)",
  "GMT-05:00 Bogota, Lima, Quito (COT)",
  "GMT-04:00 Atlantic Time (Canada) (AST)",
  "GMT-04:00 Caracas (VET)",
  "GMT-04:00 Santiago (CLT)",
  "GMT-04:00 Georgetown, La Paz (BOT)",
  "GMT-03:30 Newfoundland (NST)",
  "GMT-03:00 Brasilia (BRT)",
  "GMT-03:00 Buenos Aires, Georgetown (ART)",
  "GMT-03:00 Greenland (WGT)",
  "GMT-03:00 Montevideo (UYT)",
  "GMT-02:00 Mid-Atlantic",
  "GMT-01:00 Azores (AZOT)",
  "GMT-01:00 Cape Verde Islands (CVT)",
  "GMT+00:00 UTC",
  "GMT+00:00 Dublin, Edinburgh, Lisbon, London (GMT)",
  "GMT+00:00 Casablanca, Monrovia (WET)",
  "GMT+01:00 Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna (CET)",
  "GMT+01:00 Belgrade, Bratislava, Budapest, Prague (CET)",
  "GMT+01:00 Brussels, Copenhagen, Madrid, Paris (CET)",
  "GMT+01:00 Sarajevo, Skopje, Warsaw, Zagreb (CET)",
  "GMT+01:00 West Central Africa (WAT)",
  "GMT+02:00 Athens, Bucharest, Istanbul (EET)",
  "GMT+02:00 Cairo (EET)",
  "GMT+02:00 Harare, Pretoria (CAT)",
  "GMT+02:00 Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius (EET)",
  "GMT+02:00 Jerusalem (IST)",
  "GMT+02:00 Johannesburg (SAST)",
  "GMT+03:00 Baghdad (AST)",
  "GMT+03:00 Kuwait, Riyadh (AST)",
  "GMT+03:00 Moscow, St. Petersburg, Volgograd (MSK)",
  "GMT+03:00 Nairobi (EAT)",
  "GMT+03:30 Tehran (IRST)",
  "GMT+04:00 Abu Dhabi, Muscat (GST)",
  "GMT+04:00 Baku, Tbilisi, Yerevan (AZT)",
  "GMT+04:30 Kabul (AFT)",
  "GMT+05:00 Islamabad, Karachi (PKT)",
  "GMT+05:00 Tashkent (UZT)",
  "GMT+05:00 Yekaterinburg (YEKT)",
  "GMT+05:30 Chennai, Kolkata, Mumbai, New Delhi (IST)",
  "GMT+05:30 Sri Jayawardenepura (IST)",
  "GMT+05:45 Kathmandu (NPT)",
  "GMT+06:00 Almaty, Novosibirsk (ALMT)",
  "GMT+06:00 Astana, Dhaka (BST)",
  "GMT+06:30 Yangon (Rangoon) (MMT)",
  "GMT+07:00 Bangkok, Hanoi, Jakarta (ICT)",
  "GMT+07:00 Krasnoyarsk (KRAT)",
  "GMT+08:00 Beijing, Chongqing, Hong Kong, Urumqi (CST)",
  "GMT+08:00 Kuala Lumpur, Singapore (SGT)",
  "GMT+08:00 Irkutsk, Ulaanbaatar (IRKT)",
  "GMT+08:00 Australia/Perth (AWST)",
  "GMT+08:45 Eucla (ACWST)",
  "GMT+09:00 Osaka, Sapporo, Tokyo (JST)",
  "GMT+09:00 Seoul (KST)",
  "GMT+09:00 Yakutsk (YAKT)",
  "GMT+09:30 Australia/Adelaide (ACST)",
  "GMT+09:30 Darwin (ACST)",
  "GMT+10:00 Australia/Sydney (AEST)",
  "GMT+10:00 Australia/Melbourne (AEST)",
  "GMT+10:00 Brisbane (AEST)",
  "GMT+10:00 Canberra, Hobart (AEST)",
  "GMT+10:00 Guam, Port Moresby (ChST)",
  "GMT+10:00 Vladivostok (VLAT)",
  "GMT+10:30 Lord Howe Island (LHST)",
  "GMT+11:00 Magadan, Solomon Islands, New Caledonia (SBT)",
  "GMT+12:00 Auckland, Wellington (NZST)",
  "GMT+12:00 Fiji, Kamchatka, Marshall Islands (FJT)",
  "GMT+13:00 Nuku'alofa (TOT)",
  "GMT+13:00 Samoa (WST)",
  "GMT+14:00 Kiritimati Island (LINT)",
] as const;

export const DEFAULT_TIMEZONE = "GMT+10:00 Australia/Sydney (AEST)";

const IANA_TO_LABEL: Record<string, string> = {
  "Pacific/Midway": "GMT-11:00 Midway Island, Samoa (SST)",
  "Pacific/Honolulu": "GMT-10:00 Hawaii (HST)",
  "America/Anchorage": "GMT-09:00 Alaska (AKST)",
  "America/Los_Angeles": "GMT-08:00 Pacific Time (US & Canada) (PST)",
  "America/Tijuana": "GMT-08:00 Tijuana (PST)",
  "America/Phoenix": "GMT-07:00 Arizona (MST)",
  "America/Denver": "GMT-07:00 Mountain Time (US & Canada) (MST)",
  "America/Chicago": "GMT-06:00 Central Time (US & Canada) (CST)",
  "America/Mexico_City": "GMT-06:00 Guadalajara, Mexico City, Monterrey (CST)",
  "America/New_York": "GMT-05:00 Eastern Time (US & Canada) (EST)",
  "America/Indiana/Indianapolis": "GMT-05:00 Indiana (East) (EST)",
  "America/Bogota": "GMT-05:00 Bogota, Lima, Quito (COT)",
  "America/Halifax": "GMT-04:00 Atlantic Time (Canada) (AST)",
  "America/Caracas": "GMT-04:00 Caracas (VET)",
  "America/Santiago": "GMT-04:00 Santiago (CLT)",
  "America/St_Johns": "GMT-03:30 Newfoundland (NST)",
  "America/Sao_Paulo": "GMT-03:00 Brasilia (BRT)",
  "America/Argentina/Buenos_Aires": "GMT-03:00 Buenos Aires, Georgetown (ART)",
  "America/Godthab": "GMT-03:00 Greenland (WGT)",
  "Atlantic/Azores": "GMT-01:00 Azores (AZOT)",
  "Atlantic/Cape_Verde": "GMT-01:00 Cape Verde Islands (CVT)",
  UTC: "GMT+00:00 UTC",
  "Europe/London": "GMT+00:00 Dublin, Edinburgh, Lisbon, London (GMT)",
  "Africa/Casablanca": "GMT+00:00 Casablanca, Monrovia (WET)",
  "Europe/Berlin":
    "GMT+01:00 Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna (CET)",
  "Europe/Paris": "GMT+01:00 Brussels, Copenhagen, Madrid, Paris (CET)",
  "Europe/Warsaw": "GMT+01:00 Sarajevo, Skopje, Warsaw, Zagreb (CET)",
  "Africa/Lagos": "GMT+01:00 West Central Africa (WAT)",
  "Europe/Istanbul": "GMT+02:00 Athens, Bucharest, Istanbul (EET)",
  "Africa/Cairo": "GMT+02:00 Cairo (EET)",
  "Africa/Johannesburg": "GMT+02:00 Johannesburg (SAST)",
  "Europe/Helsinki":
    "GMT+02:00 Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius (EET)",
  "Asia/Jerusalem": "GMT+02:00 Jerusalem (IST)",
  "Asia/Baghdad": "GMT+03:00 Baghdad (AST)",
  "Asia/Riyadh": "GMT+03:00 Kuwait, Riyadh (AST)",
  "Europe/Moscow": "GMT+03:00 Moscow, St. Petersburg, Volgograd (MSK)",
  "Africa/Nairobi": "GMT+03:00 Nairobi (EAT)",
  "Asia/Tehran": "GMT+03:30 Tehran (IRST)",
  "Asia/Dubai": "GMT+04:00 Abu Dhabi, Muscat (GST)",
  "Asia/Baku": "GMT+04:00 Baku, Tbilisi, Yerevan (AZT)",
  "Asia/Kabul": "GMT+04:30 Kabul (AFT)",
  "Asia/Karachi": "GMT+05:00 Islamabad, Karachi (PKT)",
  "Asia/Tashkent": "GMT+05:00 Tashkent (UZT)",
  "Asia/Kolkata": "GMT+05:30 Chennai, Kolkata, Mumbai, New Delhi (IST)",
  "Asia/Colombo": "GMT+05:30 Sri Jayawardenepura (IST)",
  "Asia/Kathmandu": "GMT+05:45 Kathmandu (NPT)",
  "Asia/Dhaka": "GMT+06:00 Astana, Dhaka (BST)",
  "Asia/Almaty": "GMT+06:00 Almaty, Novosibirsk (ALMT)",
  "Asia/Yangon": "GMT+06:30 Yangon (Rangoon) (MMT)",
  "Asia/Bangkok": "GMT+07:00 Bangkok, Hanoi, Jakarta (ICT)",
  "Asia/Jakarta": "GMT+07:00 Bangkok, Hanoi, Jakarta (ICT)",
  "Asia/Shanghai": "GMT+08:00 Beijing, Chongqing, Hong Kong, Urumqi (CST)",
  "Asia/Hong_Kong": "GMT+08:00 Beijing, Chongqing, Hong Kong, Urumqi (CST)",
  "Asia/Singapore": "GMT+08:00 Kuala Lumpur, Singapore (SGT)",
  "Asia/Kuala_Lumpur": "GMT+08:00 Kuala Lumpur, Singapore (SGT)",
  "Australia/Perth": "GMT+08:00 Australia/Perth (AWST)",
  "Asia/Tokyo": "GMT+09:00 Osaka, Sapporo, Tokyo (JST)",
  "Asia/Seoul": "GMT+09:00 Seoul (KST)",
  "Australia/Adelaide": "GMT+09:30 Australia/Adelaide (ACST)",
  "Australia/Darwin": "GMT+09:30 Darwin (ACST)",
  "Australia/Sydney": "GMT+10:00 Australia/Sydney (AEST)",
  "Australia/Melbourne": "GMT+10:00 Australia/Melbourne (AEST)",
  "Australia/Brisbane": "GMT+10:00 Brisbane (AEST)",
  "Australia/Hobart": "GMT+10:00 Canberra, Hobart (AEST)",
  "Pacific/Guam": "GMT+10:00 Guam, Port Moresby (ChST)",
  "Pacific/Auckland": "GMT+12:00 Auckland, Wellington (NZST)",
  "Pacific/Fiji": "GMT+12:00 Fiji, Kamchatka, Marshall Islands (FJT)",
  "Pacific/Tongatapu": "GMT+13:00 Nuku'alofa (TOT)",
  "Pacific/Apia": "GMT+13:00 Samoa (WST)",
  "Pacific/Kiritimati": "GMT+14:00 Kiritimati Island (LINT)",
};

export function timezoneLabelFromIana(tz?: string): string {
  if (!tz) return DEFAULT_TIMEZONE;
  return IANA_TO_LABEL[tz] ?? WORLD_TIMEZONES.find((label) => label.includes(tz)) ?? tz;
}

const ZONE_ALIASES: Record<string, string> = {
  "Asia/Katmandu": "Asia/Kathmandu",
};

/** Dropdown labels such as `Asia/Kathmandu (+05:45)`. */
export function timezoneChoiceList() {
  return Object.entries(IANA_TO_LABEL).map(([id, label]) => {
    const offset = label.match(/GMT([+-]\d{2}:\d{2})/)?.[1] ?? "";
    return { id, label: offset ? `${id} (${offset})` : id };
  });
}

/** CRM APIs want IANA ids, not the GMT display labels. */
export function ianaTimezoneFromLabel(label?: string): string {
  const raw = ZONE_ALIASES[label?.trim() || ""] || label?.trim() || "";
  if (!raw) return "Australia/Sydney";
  if (IANA_TO_LABEL[raw]) return raw;
  const match = Object.entries(IANA_TO_LABEL).find(([, value]) => value === raw);
  if (match) return match[0];
  const embedded = raw.match(/([A-Za-z]+\/[A-Za-z0-9_+\-]+)/);
  if (embedded?.[1] && IANA_TO_LABEL[embedded[1]]) return embedded[1];
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const num = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    num("year"),
    num("month") - 1,
    num("day"),
    num("hour"),
    num("minute"),
    num("second"),
  );
  return asUtc - instant.getTime();
}

/** Interpret `YYYY-MM-DD` + `HH:mm` as wall clock in a CRM timezone label or IANA id. */
export function dateInTimezone(
  dateIso: string,
  hhmm: string,
  timeZoneInput?: string,
): Date {
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const timeZone = ianaTimezoneFromLabel(timeZoneInput);
  const desiredUtc = Date.UTC(
    year,
    (month || 1) - 1,
    day || 1,
    hour || 0,
    minute || 0,
    0,
  );
  let utc = desiredUtc;
  for (let i = 0; i < 3; i += 1) {
    utc = desiredUtc - zoneOffsetMs(new Date(utc), timeZone);
  }
  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? new Date(`${dateIso}T${hhmm}`) : result;
}

/** Calendar date (`YYYY-MM-DD`) for `now` in a CRM timezone. */
export function todayIsoInTimezone(
  timeZoneInput?: string,
  now = new Date(),
): string {
  const timeZone = ianaTimezoneFromLabel(timeZoneInput);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isPastBookingDate(
  dateIso: string,
  timeZoneInput?: string,
  now = new Date(),
): boolean {
  const day = dateIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < todayIsoInTimezone(timeZoneInput, now);
}

export function isPastBookingStart(
  dateIso: string,
  hhmm: string,
  timeZoneInput?: string,
  now = new Date(),
): boolean {
  if (isPastBookingDate(dateIso, timeZoneInput, now)) return true;
  const start = dateInTimezone(dateIso, hhmm || "00:00", timeZoneInput);
  return start.getTime() < now.getTime();
}

export function clampBookableDate(
  dateIso: string,
  timeZoneInput?: string,
  now = new Date(),
): string {
  const today = todayIsoInTimezone(timeZoneInput, now);
  const day = dateIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today) return today;
  return day;
}
