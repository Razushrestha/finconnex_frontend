import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type SettingsPageValues = Record<string, string | number | boolean>;
export type SettingsCatalog = Record<string, SettingsPageValues>;

const PAGE_KEY = /^[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}$/;
const memory = new Map<string, SettingsCatalog>();

function isServerlessHost() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

function catalogDir() {
  if (isServerlessHost()) {
    return path.join(/* turbopackIgnore: true */ tmpdir(), "finconnex-settings");
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "settings-catalog",
  );
}

function fileFor(workspaceId: string) {
  const id = workspaceId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80) || "workspace";
  return path.join(/* turbopackIgnore: true */ catalogDir(), `${id}.json`);
}

function asPageValues(raw: unknown): SettingsPageValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SettingsPageValues = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) {
      out[id] = value;
    }
  }
  return out;
}

function asCatalog(raw: unknown): SettingsCatalog {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SettingsCatalog = {};
  for (const [key, page] of Object.entries(raw as Record<string, unknown>)) {
    if (!PAGE_KEY.test(key)) continue;
    out[key] = asPageValues(page);
  }
  return out;
}

export async function readFallbackCatalog(
  workspaceId: string,
): Promise<SettingsCatalog> {
  const cached = memory.get(workspaceId);
  if (cached) return cached;
  try {
    const raw = await readFile(fileFor(workspaceId), "utf8");
    const parsed = asCatalog(JSON.parse(raw));
    memory.set(workspaceId, parsed);
    return parsed;
  } catch {
    return {};
  }
}

async function persistCatalog(workspaceId: string, catalog: SettingsCatalog) {
  memory.set(workspaceId, catalog);
  try {
    await mkdir(catalogDir(), { recursive: true });
    await writeFile(fileFor(workspaceId), JSON.stringify(catalog), "utf8");
  } catch {
    /* Memory is enough for this process. */
  }
}

export async function writeFallbackPage(
  workspaceId: string,
  pageKey: string,
  values: unknown,
): Promise<SettingsCatalog> {
  const catalog = await readFallbackCatalog(workspaceId);
  if (!PAGE_KEY.test(pageKey)) return catalog;
  catalog[pageKey] = asPageValues(values);
  await persistCatalog(workspaceId, catalog);
  return catalog;
}

export async function mergeFallbackCatalog(
  workspaceId: string,
  incoming: unknown,
): Promise<SettingsCatalog> {
  const catalog = {
    ...(await readFallbackCatalog(workspaceId)),
    ...asCatalog(incoming),
  };
  await persistCatalog(workspaceId, catalog);
  return catalog;
}

export function settingsProxyKind(
  path: string[],
):
  | { kind: "root" }
  | { kind: "pages" }
  | { kind: "page"; category: string; subpage: string }
  | null {
  if (path[0] !== "settings") return null;
  if (path.length === 1) return { kind: "root" };
  if (path[1] !== "pages") return null;
  if (path.length === 2) return { kind: "pages" };
  if (path.length === 4) {
    return { kind: "page", category: path[2], subpage: path[3] };
  }
  return null;
}

function parseEnvelope(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const json = JSON.parse(text) as unknown;
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function dataRecord(envelope: Record<string, unknown>): Record<string, unknown> {
  const data = envelope.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return envelope;
}

export function withCatalogOnSettings(
  text: string,
  catalog: SettingsCatalog,
  extraPage?: { key: string; values: SettingsPageValues },
): string {
  const envelope = parseEnvelope(text) ?? { statusCode: 200, data: {} };
  const data = dataRecord(envelope);
  const merged = {
    ...asCatalog(data.catalog),
    ...catalog,
    ...(extraPage ? { [extraPage.key]: extraPage.values } : {}),
  };
  if (envelope.data && typeof envelope.data === "object") {
    envelope.data = { ...data, catalog: merged };
  } else {
    envelope.catalog = merged;
  }
  envelope.statusCode = 200;
  envelope.message = envelope.message || "Settings updated";
  return JSON.stringify(envelope);
}

export function pagesListPayload(catalog: SettingsCatalog, revision = 1) {
  return JSON.stringify({
    statusCode: 200,
    message: "Settings catalog retrieved",
    data: { catalog, revision },
  });
}

export function pagePayload(
  pageKey: string,
  values: SettingsPageValues,
  revision = 1,
) {
  return JSON.stringify({
    statusCode: 200,
    message: "Settings page retrieved",
    data: { pageKey, values, revision },
  });
}

export function catalogFromPatchBody(body: string | undefined): SettingsCatalog {
  const parsed = parseEnvelope(body || "");
  return asCatalog(parsed?.catalog);
}

export function pageValuesFromPutBody(body: string | undefined): SettingsPageValues {
  const parsed = parseEnvelope(body || "");
  return asPageValues(parsed?.values ?? parsed);
}

export function stripCatalogFromPatchBody(body: string | undefined): string {
  const parsed = parseEnvelope(body || "") ?? {};
  delete parsed.catalog;
  return JSON.stringify(parsed);
}
