/**
 * Lead Card admin config (spec §3–§4, §13).
 * Persisted via Settings store: crm-configuration/lead-card
 */

import {
  loadSettingsValues,
  saveSettingsValues,
  type SettingsValues,
} from "@/lib/settings/settings-store";
import { isBrowser } from "@/lib/rules/storage";
import { UNREPLIED_THRESHOLD_MS } from "@/lib/leads/card-types";
import {
  OWNER_AVATAR_DEFAULT,
  UNREPLIED_THRESHOLD_HOURS_DEFAULT,
} from "@/lib/leads/product-decisions";
import {
  cardFieldKeyForCustom,
  parseCustomCardFieldKey,
} from "@/lib/custom-fields/types";
import { listActiveCustomFieldsForEntity } from "@/lib/custom-fields/store";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import { stageColumnId } from "@/lib/pipeline-sla/board";

/** Mirrors Kanban header palette (Settings → Lead Card). */
export const LEAD_CARD_HEADER_PALETTE = [
  "#3B82F6",
  "#06B6D4",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#EF4444",
  "#64748B",
] as const;

export const DEFAULT_LEAD_CARD_HEADER_COLOR = "#6366F1";

export type LeadCardHeaderStyle = "Multi Colour" | "Single Colour" | "None";

function defaultMultiHeaderColors(): Record<string, string> {
  return MORTGAGE_PIPELINE_STAGES.reduce(
    (acc, stage, i) => {
      acc[stageColumnId(stage)] =
        LEAD_CARD_HEADER_PALETTE[i % LEAD_CARD_HEADER_PALETTE.length] ??
        DEFAULT_LEAD_CARD_HEADER_COLOR;
      return acc;
    },
    {} as Record<string, string>,
  );
}

export const LEAD_CARD_SETTINGS_KEY = "crm-configuration/lead-card";
export const LEAD_CARD_SETTINGS_PATH = "/settings/crm-configuration/lead-card";
export const MAX_DYNAMIC_FIELDS = 4;

export const LEAD_CARD_FIELD_OPTIONS = [
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "source", label: "Lead Source" },
  { key: "status", label: "Pipeline / Stage" },
  { key: "tags", label: "Tags" },
  { key: "industry", label: "Industry" },
  { key: "jobTitle", label: "Job Title" },
  { key: "companyWebsite", label: "Website" },
  { key: "companySize", label: "Company Size" },
  { key: "notes", label: "Notes" },
  { key: "estimatedValue", label: "Estimated Value" },
  { key: "productInterest", label: "Product Interest" },
  { key: "budgetRange", label: "Budget" },
  { key: "owner", label: "Owner name" },
  { key: "createdDate", label: "Created date" },
] as const;

export type LeadCardBuiltinFieldKey =
  (typeof LEAD_CARD_FIELD_OPTIONS)[number]["key"];

/** Built-in Lead Details keys or `cf:<customKey>` from Settings → Custom Fields. */
export type LeadCardFieldKey = string;

export interface LeadCardFieldOption {
  key: LeadCardFieldKey;
  label: string;
  group: "builtin" | "custom";
}

export interface LeadCardSettings {
  showOwnerAvatar: boolean;
  dynamicFieldKeys: LeadCardFieldKey[];
  /** Hours before unreplied SMS/email counts as broken (default 24). */
  unrepliedThresholdHours: number;
  /** Kanban column header style — configured in Settings, not on the board. */
  headerStyle: LeadCardHeaderStyle | string;
  singleHeaderColor: string;
  multiHeaderColors: Record<string, string>;
}

export const DEFAULT_LEAD_CARD_SETTINGS: LeadCardSettings = {
  showOwnerAvatar: OWNER_AVATAR_DEFAULT,
  dynamicFieldKeys: ["company", "email", "phone"],
  unrepliedThresholdHours: UNREPLIED_THRESHOLD_HOURS_DEFAULT,
  headerStyle: "Multi Colour",
  singleHeaderColor: DEFAULT_LEAD_CARD_HEADER_COLOR,
  multiHeaderColors: defaultMultiHeaderColors(),
};

const FIELD_KEY_SET = new Set<string>(
  LEAD_CARD_FIELD_OPTIONS.map((f) => f.key),
);

export function isLeadCardFieldKey(key: string): boolean {
  if (FIELD_KEY_SET.has(key)) return true;
  return parseCustomCardFieldKey(key) != null;
}

/** Built-in + active Lead custom fields for the admin picker. */
export function listLeadCardFieldOptions(): LeadCardFieldOption[] {
  const builtin: LeadCardFieldOption[] = LEAD_CARD_FIELD_OPTIONS.map((f) => ({
    key: f.key,
    label: f.label,
    group: "builtin",
  }));
  let custom: LeadCardFieldOption[] = [];
  try {
    custom = listActiveCustomFieldsForEntity("Lead").map((f) => ({
      key: cardFieldKeyForCustom(f.key),
      label: f.label,
      group: "custom" as const,
    }));
  } catch {
    custom = [];
  }
  return [...builtin, ...custom];
}

function parseFieldKeys(raw: unknown): LeadCardFieldKey[] {
  if (typeof raw !== "string" || !raw.trim()) {
    return [...DEFAULT_LEAD_CARD_SETTINGS.dynamicFieldKeys];
  }
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => isLeadCardFieldKey(k));
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    return [...DEFAULT_LEAD_CARD_SETTINGS.dynamicFieldKeys];
  }
  return unique.slice(0, MAX_DYNAMIC_FIELDS);
}

export function settingsValuesToLeadCard(
  values: SettingsValues,
): LeadCardSettings {
  const hours = Number(values.unrepliedThresholdHours);
  const headerStyle =
    typeof values.headerStyle === "string" && values.headerStyle.trim()
      ? values.headerStyle.trim()
      : DEFAULT_LEAD_CARD_SETTINGS.headerStyle;
  const singleHeaderColor =
    typeof values.singleHeaderColor === "string" &&
    values.singleHeaderColor.trim()
      ? values.singleHeaderColor.trim()
      : DEFAULT_LEAD_CARD_SETTINGS.singleHeaderColor;
  let multiHeaderColors = { ...DEFAULT_LEAD_CARD_SETTINGS.multiHeaderColors };
  if (typeof values.multiHeaderColors === "string" && values.multiHeaderColors) {
    try {
      const parsed = JSON.parse(values.multiHeaderColors) as Record<
        string,
        unknown
      >;
      if (parsed && typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" && value.trim()) {
            multiHeaderColors[key] = value.trim();
          }
        }
      }
    } catch {
      /* keep defaults */
    }
  }
  return {
    showOwnerAvatar: Boolean(values.showOwnerAvatar),
    dynamicFieldKeys: parseFieldKeys(values.dynamicFields),
    unrepliedThresholdHours:
      Number.isFinite(hours) && hours > 0
        ? Math.min(168, Math.round(hours))
        : DEFAULT_LEAD_CARD_SETTINGS.unrepliedThresholdHours,
    headerStyle,
    singleHeaderColor,
    multiHeaderColors,
  };
}

export function leadCardSettingsToValues(
  settings: LeadCardSettings,
): SettingsValues {
  return {
    showOwnerAvatar: settings.showOwnerAvatar,
    dynamicFields: settings.dynamicFieldKeys.join(","),
    unrepliedThresholdHours: settings.unrepliedThresholdHours,
    headerStyle: settings.headerStyle,
    singleHeaderColor: settings.singleHeaderColor,
    multiHeaderColors: JSON.stringify(settings.multiHeaderColors ?? {}),
  };
}

export function loadLeadCardSettings(): LeadCardSettings {
  const saved = loadSettingsValues(LEAD_CARD_SETTINGS_KEY);
  if (!Object.keys(saved).length) {
    return {
      ...DEFAULT_LEAD_CARD_SETTINGS,
      multiHeaderColors: defaultMultiHeaderColors(),
    };
  }
  return settingsValuesToLeadCard({
    ...leadCardSettingsToValues(DEFAULT_LEAD_CARD_SETTINGS),
    ...saved,
  });
}

export function saveLeadCardSettings(settings: LeadCardSettings) {
  const normalized: LeadCardSettings = {
    showOwnerAvatar: settings.showOwnerAvatar,
    dynamicFieldKeys: settings.dynamicFieldKeys
      .filter(isLeadCardFieldKey)
      .slice(0, MAX_DYNAMIC_FIELDS),
    unrepliedThresholdHours: settings.unrepliedThresholdHours,
    headerStyle: settings.headerStyle || "Multi Colour",
    singleHeaderColor:
      settings.singleHeaderColor || DEFAULT_LEAD_CARD_HEADER_COLOR,
    multiHeaderColors: {
      ...defaultMultiHeaderColors(),
      ...(settings.multiHeaderColors ?? {}),
    },
  };
  saveSettingsValues(
    LEAD_CARD_SETTINGS_KEY,
    leadCardSettingsToValues(normalized),
    {
      path: LEAD_CARD_SETTINGS_PATH,
      title: "Lead Card",
    },
  );
  emitLeadCardSettingsChange();
  return normalized;
}

export function emitLeadCardSettingsChange() {
  if (!isBrowser()) return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("finconnex:lead-card-settings"));
}

export function onLeadCardSettingsChange(handler: () => void): () => void {
  if (!isBrowser()) return () => {};
  const listener = () => handler();
  window.addEventListener("finconnex:lead-card-settings", listener);
  return () =>
    window.removeEventListener("finconnex:lead-card-settings", listener);
}

export function unrepliedThresholdMs(
  settings: LeadCardSettings = loadLeadCardSettings(),
): number {
  return settings.unrepliedThresholdHours * 60 * 60 * 1000;
}

/** Fallback for modules that still import the constant. */
export function resolveUnrepliedThresholdMs(): number {
  try {
    return unrepliedThresholdMs();
  } catch {
    return UNREPLIED_THRESHOLD_MS;
  }
}
