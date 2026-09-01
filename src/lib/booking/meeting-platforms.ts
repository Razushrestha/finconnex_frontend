import { loadSettingsValues } from "@/lib/settings/settings-store";

export const ONLINE_MEETING_PLATFORMS = [
  "Google Meet",
  "Zoom",
  "Microsoft Teams",
] as const;

export type OnlineMeetingPlatform = (typeof ONLINE_MEETING_PLATFORMS)[number];

export const MEETING_LOCATION_KINDS = [
  ...ONLINE_MEETING_PLATFORMS,
  "Office address",
  "Custom",
] as const;

export type MeetingLocationKind = (typeof MEETING_LOCATION_KINDS)[number];

const INTEGRATION_KEYS: Record<
  OnlineMeetingPlatform,
  { schema: string; field: string }[]
> = {
  "Google Meet": [
    { schema: "integrations/google-calendar", field: "google_calendar_connected" },
    { schema: "integrations/google", field: "google_connected" },
  ],
  Zoom: [{ schema: "integrations/zoom", field: "zoom_connected" }],
  "Microsoft Teams": [
    { schema: "integrations/microsoft-teams", field: "microsoft_teams_connected" },
    { schema: "integrations/microsoft-365", field: "microsoft_365_connected" },
  ],
};

function isConnected(schema: string, field: string) {
  if (typeof window === "undefined") return false;
  return Boolean(loadSettingsValues(schema)[field]);
}

export function integratedMeetingPlatforms(): OnlineMeetingPlatform[] {
  return ONLINE_MEETING_PLATFORMS.filter((platform) =>
    INTEGRATION_KEYS[platform].some((item) =>
      isConnected(item.schema, item.field),
    ),
  );
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
