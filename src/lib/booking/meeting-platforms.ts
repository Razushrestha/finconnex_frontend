import { loadSettingsValues } from "@/lib/settings/settings-store";

export const ONLINE_MEETING_PLATFORMS = [
  "Google Meet",
  "Zoom",
  "Microsoft Teams",
] as const;

export type OnlineMeetingPlatform = (typeof ONLINE_MEETING_PLATFORMS)[number];

/** Native conferencing options the booking API already names. Always listed. */
export const NATIVE_ONLINE_PLATFORMS: OnlineMeetingPlatform[] = [
  "Google Meet",
  "Zoom",
];

export const MEETING_LOCATION_KINDS = [
  ...ONLINE_MEETING_PLATFORMS,
  "Office address",
  "Custom",
] as const;

export type MeetingLocationKind = (typeof MEETING_LOCATION_KINDS)[number];

export type EventTypeLocationType =
  | "GOOGLE_MEET"
  | "ZOOM"
  | "MICROSOFT_TEAMS"
  | "IN_PERSON"
  | "PHONE"
  | "CUSTOM";

const INTEGRATION_KEYS: Record<
  OnlineMeetingPlatform,
  { schema: string; fields: string[] }[]
> = {
  "Google Meet": [
    { schema: "integrations/google-calendar", fields: ["connected", "google_calendar_connected"] },
    { schema: "integrations/google", fields: ["connected", "google_connected"] },
    { schema: "integrations/google-meet", fields: ["connected"] },
  ],
  Zoom: [{ schema: "integrations/zoom", fields: ["connected", "zoom_connected"] }],
  "Microsoft Teams": [
    {
      schema: "integrations/microsoft-teams",
      fields: ["connected", "microsoft_teams_connected"],
    },
    {
      schema: "integrations/microsoft-365",
      fields: ["connected", "microsoft_365_connected"],
    },
  ],
};

function isTruthySetting(value: unknown) {
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "enabled" ||
    normalized === "connected" ||
    normalized === "on"
  );
}

function schemaLooksConnected(schema: string, fields: string[]) {
  if (typeof window === "undefined") return false;
  const values = loadSettingsValues(schema);
  return fields.some((field) => isTruthySetting(values[field]));
}

export function isMeetingIntegrationConnected(platform: OnlineMeetingPlatform) {
  return INTEGRATION_KEYS[platform].some((item) =>
    schemaLooksConnected(item.schema, item.fields),
  );
}

export function integratedMeetingPlatforms(): OnlineMeetingPlatform[] {
  return ONLINE_MEETING_PLATFORMS.filter(isMeetingIntegrationConnected);
}

/** Zoom + Google Meet always; Teams when the workspace integration is on. */
export function selectableOnlinePlatforms(): OnlineMeetingPlatform[] {
  const listed: OnlineMeetingPlatform[] = [...NATIVE_ONLINE_PLATFORMS];
  for (const platform of integratedMeetingPlatforms()) {
    if (!listed.includes(platform)) listed.push(platform);
  }
  return listed;
}

export function availableCustomLocationKinds(): MeetingLocationKind[] {
  return [...MEETING_LOCATION_KINDS];
}

export function isOnlineLocationKind(kind: MeetingLocationKind) {
  return (ONLINE_MEETING_PLATFORMS as readonly string[]).includes(kind);
}

const FALLBACK_OFFICE_ADDRESS =
  "Level 12, 100 Pitt Street, Sydney NSW 2000";

export function defaultOfficeAddress() {
  if (typeof window === "undefined") return FALLBACK_OFFICE_ADDRESS;
  const saved = loadSettingsValues("organization/company-profile").address;
  if (typeof saved === "string" && saved.trim()) return saved.trim();
  return FALLBACK_OFFICE_ADDRESS;
}

export function apiLocationTypeFromPlatform(
  platform: string,
): EventTypeLocationType {
  if (platform === "Google Meet") return "GOOGLE_MEET";
  if (platform === "Zoom") return "ZOOM";
  if (platform === "Microsoft Teams") return "MICROSOFT_TEAMS";
  return "CUSTOM";
}

export function platformLabelFromLocationType(raw: string): string {
  const value = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (value.includes("GOOGLE")) return "Google Meet";
  if (value.includes("ZOOM")) return "Zoom";
  if (value.includes("TEAM")) return "Microsoft Teams";
  if (value.includes("PHONE")) return "Phone";
  if (value.includes("PERSON") || value.includes("OFFLINE") || value.includes("IN_PERSON")) {
    return "Office address";
  }
  return raw;
}

export function eventTypeLocationPayload(input: {
  meetingPlace: "online" | "offline" | "phone";
  platform?: string;
  locationDetail?: string;
}): { locationType: EventTypeLocationType; location: string } {
  if (input.meetingPlace === "online") {
    const platform = input.platform?.trim() || "Zoom";
    return {
      locationType: apiLocationTypeFromPlatform(platform),
      location: platform,
    };
  }
  if (input.meetingPlace === "offline") {
    return {
      locationType: "IN_PERSON",
      location: input.locationDetail?.trim() || "In person",
    };
  }
  return {
    locationType: "PHONE",
    location: input.locationDetail?.trim() || "Phone",
  };
}
