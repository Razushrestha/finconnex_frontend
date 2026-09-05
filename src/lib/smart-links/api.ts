import { isUuid } from "@/lib/activity-timeline/auth";
import { crmErrorMessage, unwrapCrmData } from "@/lib/crm/request";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";
import { prepareHubForSave, saveHubConfigToLocalStorage } from "@/lib/broker-hub/types";

export type CrmSmartHub = BrokerHubConfig & {
  id: string;
  templateId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmSmartShortLink = {
  id: string;
  alias: string;
  destination: string;
  clicks: number;
  generateQr: boolean;
  createdAt: string;
};

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "hubs", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
  }
  return "";
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      )
    : [];
}

export function hubPublicPath(slug: string): string {
  return `/h/${encodeURIComponent(slug)}`;
}

export function shortLinkPublicPath(alias: string): string {
  return `/go/${encodeURIComponent(alias)}`;
}

export function hubPublicUrl(slug: string): string {
  if (typeof window === "undefined") return hubPublicPath(slug);
  return `${window.location.origin}${hubPublicPath(slug)}`;
}

export function shortLinkPublicUrl(alias: string): string {
  if (typeof window === "undefined") return shortLinkPublicPath(alias);
  return `${window.location.origin}${shortLinkPublicPath(alias)}`;
}

export function mapHubResponse(raw: Record<string, unknown>): CrmSmartHub {
  const slug = pickStr(raw.slug, (raw.profile as { slug?: string } | undefined)?.slug);
  const customization =
    raw.customization && typeof raw.customization === "object"
      ? (raw.customization as BrokerHubConfig["customization"])
      : { theme: "default", fontStyle: "sans" };
  return {
    id: pickStr(raw.id),
    brokerId: pickStr(raw.createdById, raw.brokerId, "me"),
    hubName: pickStr(raw.hubName, raw.title, "Broker Hub"),
    profile: {
      slug,
      avatarUrl: pickStr(raw.avatarUrl) || null,
      title: pickStr(raw.title, raw.hubName, "Broker"),
      bio: pickStr(raw.bio),
    },
    links: asObjectArray(raw.links) as unknown as BrokerHubConfig["links"],
    socials: asObjectArray(raw.socials) as unknown as BrokerHubConfig["socials"],
    customization,
    published: Boolean(raw.published),
    templateId: pickStr(raw.templateId) || undefined,
    createdAt: pickStr(raw.createdAt) || undefined,
    updatedAt: pickStr(raw.updatedAt) || undefined,
  };
}

function mapShortLink(raw: Record<string, unknown>): CrmSmartShortLink {
  return {
    id: pickStr(raw.id),
    alias: pickStr(raw.alias),
    destination: pickStr(raw.destination),
    clicks: typeof raw.clicks === "number" ? raw.clicks : Number(raw.clicks) || 0,
    generateQr: Boolean(raw.generateQr),
    createdAt: pickStr(raw.createdAt) || new Date().toISOString(),
  };
}

async function smartRequest(path: string, init?: RequestInit): Promise<unknown> {
  const suffix = path.startsWith("/v1/") ? path.slice(3) : path;
  const res = await fetch(`/api/auth/smart-link${suffix}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `CRM request failed (${res.status})`));
  }
  return unwrapCrmData(json);
}

export function toHubBody(config: BrokerHubConfig): Record<string, unknown> {
  const prepared = prepareHubForSave(config);
  return {
    slug: prepared.profile.slug,
    hubName: prepared.hubName,
    title: prepared.profile.title,
    bio: prepared.profile.bio ?? "",
    avatarUrl: prepared.profile.avatarUrl || undefined,
    links: prepared.links ?? [],
    socials: prepared.socials ?? [],
    customization: prepared.customization ?? { theme: "default", fontStyle: "sans" },
    published: prepared.published,
    templateId: prepared.templateId || undefined,
  };
}

export async function listCrmSmartHubs(): Promise<CrmSmartHub[]> {
  const data = await smartRequest("/v1/smart-hubs");
  return extractRecords(data).map(mapHubResponse).filter((row) => row.id);
}

export async function getCrmSmartHub(id: string): Promise<CrmSmartHub | null> {
  if (!isUuid(id)) return null;
  const data = await smartRequest(`/v1/smart-hubs/${id}`);
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapHubResponse(data as Record<string, unknown>)
      : extractRecords(data).map(mapHubResponse)[0];
  return row?.id ? row : null;
}

export async function persistCrmHub(
  config: BrokerHubConfig,
): Promise<CrmSmartHub> {
  const body = JSON.stringify(toHubBody(config));
  const data = config.id && isUuid(config.id)
    ? await smartRequest(`/v1/smart-hubs/${config.id}`, {
        method: "PATCH",
        body,
      })
    : await smartRequest("/v1/smart-hubs", { method: "POST", body });
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapHubResponse(data as Record<string, unknown>)
      : extractRecords(data).map(mapHubResponse)[0];
  if (!row?.id) throw new Error("Hub was not saved");
  return row;
}

export async function listCrmSmartShortLinks(): Promise<CrmSmartShortLink[]> {
  const data = await smartRequest("/v1/smart-short-links");
  return extractRecords(data).map(mapShortLink).filter((row) => row.id);
}

export async function createCrmSmartShortLink(input: {
  destination: string;
  alias?: string;
  generateQr?: boolean;
}): Promise<CrmSmartShortLink> {
  const data = await smartRequest("/v1/smart-short-links", {
    method: "POST",
    body: JSON.stringify({
      destination: input.destination,
      alias: input.alias || undefined,
      generateQr: input.generateQr ?? false,
    }),
  });
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapShortLink(data as Record<string, unknown>)
      : extractRecords(data).map(mapShortLink)[0];
  if (!row?.id) throw new Error("Short link was not created");
  return row;
}

export async function deleteCrmSmartShortLink(id: string): Promise<void> {
  await smartRequest(`/v1/smart-short-links/${id}`, { method: "DELETE" });
}

export async function fetchPublishedHubBySlug(
  slug: string,
): Promise<BrokerHubConfig | null> {
  const data = await smartRequest(
    `/v1/public/smart-hubs/${encodeURIComponent(slug)}`,
  );
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapHubResponse(data as Record<string, unknown>)
      : null;
  if (!row?.profile.slug) return null;
  return row;
}

export async function resolvePublicShortLink(
  alias: string,
): Promise<string | null> {
  const data = await smartRequest(
    `/v1/public/smart-short-links/${encodeURIComponent(alias)}`,
  );
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const destination = pickStr((data as Record<string, unknown>).destination);
    return destination || null;
  }
  return null;
}

export async function trySmartLink<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export async function saveBrokerHub(
  config: BrokerHubConfig,
): Promise<BrokerHubConfig> {
  const prepared = prepareHubForSave(config);
  saveHubConfigToLocalStorage(prepared);
  const remote = await persistCrmHub(prepared);
  saveHubConfigToLocalStorage(remote);
  return remote;
}
