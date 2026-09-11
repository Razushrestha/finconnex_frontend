import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  normalizeSignatureRequestRemote,
  normalizeSignatureRequests,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import {
  upsertSignatureRequest,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function compactBody(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value == null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  );
}

export function workspaceSignatureTemplatesPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/signature-templates${suffix}`;
}

export function globalSignatureTemplatesPath(suffix = ""): string {
  return `/v1/signature-templates${suffix}`;
}

function isMissingCrmRoute(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /\(404\)|not found/i.test(message);
}

async function templatesCall(
  suffix: string,
  query = "",
  init?: RequestInit,
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  const paths = [
    ...(scoped?.workspaceId
      ? [`${workspaceSignatureTemplatesPath(scoped.workspaceId, suffix)}${query}`]
      : []),
    `${globalSignatureTemplatesPath(suffix)}${query}`,
  ].filter((path, index, all) => all.indexOf(path) === index);

  let lastError: unknown;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      if (isBoundCrmSession() && scoped) {
        return await crmFetch(scoped, paths[i], init);
      }
      return await crmBffFetch(paths[i], init);
    } catch (err) {
      lastError = err;
      if (i < paths.length - 1 && isMissingCrmRoute(err)) continue;
      throw err;
    }
  }
  throw lastError;
}

function asTemplate(data: unknown): SignatureRequest | null {
  const items = normalizeSignatureRequests(data).map((row) => ({
    ...row,
    recordType: "template" as const,
  }));
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return {
      ...normalizeSignatureRequestRemote(data as Record<string, unknown>, 0),
      recordType: "template",
    };
  }
  return null;
}

export function toCreateSignatureTemplateBody(
  input: SignatureRequest,
): Record<string, unknown> {
  return compactBody({
    title: input.documentName.trim(),
    name: input.documentName.trim(),
    description: pickStr(input.relatedTo, input.documentFile),
    signingOrder: input.signingOrder.toUpperCase(),
    roles: input.signers.map((signer) =>
      compactBody({
        name: signer.name.trim() || signer.role,
        role: signer.role.toUpperCase(),
        order: signer.order,
      }),
    ),
    fields: input.fields.map((field) =>
      compactBody({
        type: field.kind.toUpperCase(),
        page: field.page || 1,
        x: field.x,
        y: field.y,
        width: field.w,
        height: field.h,
        required: field.required,
        label: field.label,
      }),
    ),
  });
}

export async function listCrmSignatureTemplates(): Promise<SignatureRequest[]> {
  return normalizeSignatureRequests(await templatesCall("")).map((row) => ({
    ...row,
    recordType: "template" as const,
  }));
}

export async function getCrmSignatureTemplate(
  id: string,
): Promise<SignatureRequest | null> {
  return asTemplate(await templatesCall(`/${id}`));
}

export async function createCrmSignatureTemplate(
  body: Record<string, unknown>,
): Promise<SignatureRequest | null> {
  return asTemplate(
    await templatesCall("", "", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmSignatureTemplate(
  id: string,
  body: Record<string, unknown>,
): Promise<SignatureRequest | null> {
  return asTemplate(
    await templatesCall(`/${id}`, "", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmSignatureTemplate(id: string): Promise<void> {
  await templatesCall(`/${id}`, "", { method: "DELETE" });
}

export async function createCrmSignatureRequestFromTemplate(
  templateId: string,
  body: Record<string, unknown> = {},
): Promise<SignatureRequest | null> {
  const items = normalizeSignatureRequests(
    await templatesCall(`/${templateId}/requests`, "", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  return items[0] ?? null;
}

export function persistRemoteSignatureTemplate(row: SignatureRequest | null) {
  if (row) {
    upsertSignatureRequest(
      { ...row, recordType: "template" },
      { allowEmptyFields: true },
    );
  }
  return row;
}

export function isCrmSignatureTemplateId(id: string) {
  return isUuid(id);
}

export { tryCrmSignatureRequest as tryCrmSignatureTemplate };
