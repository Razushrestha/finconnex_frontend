import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  normalizeSignatureRequestRemote,
  normalizeSignatureRequests,
  toCrmFieldGeometry,
  toCrmSignatureFieldType,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import {
  PREFILL_RECIPIENT_ID,
  upsertSignatureRequest,
  type SignatureRequest,
  type SignerRole,
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

function crmTemplateRole(role: SignerRole): string {
  if (role === "Approver") return "APPROVER";
  if (role === "CC") return "CC";
  return "SIGNER";
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

/** Nest CreateSignatureTemplateDto — requires documentId + roles[].label. */
export function toCreateSignatureTemplateBody(
  input: SignatureRequest,
  documentId: string,
): Record<string, unknown> {
  const roles = input.signers.map((signer) =>
    compactBody({
      label:
        (signer.roleLabel ?? "").trim() ||
        signer.name.trim() ||
        signer.role,
      role: crmTemplateRole(signer.role),
      deliverVia: signer.deliveryMethod === "email_sms" ? "EMAIL_SMS" : "EMAIL",
    }),
  );
  const roleIndexBySigner = new Map(
    input.signers.map((signer, index) => [signer.id, index]),
  );
  const fields = input.fields.flatMap((field) => {
    if (field.signerId === PREFILL_RECIPIENT_ID) return [];
    const roleIndex = roleIndexBySigner.get(field.signerId);
    if (roleIndex == null) return [];
    const box = toCrmFieldGeometry(field);
    return [
      compactBody({
        roleIndex,
        type: toCrmSignatureFieldType(field.kind),
        pageNumber: box.pageNumber,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        required: field.required !== false,
      }),
    ];
  });

  return compactBody({
    name: input.documentName.trim(),
    description: pickStr(input.relatedTo),
    documentId,
    signingOrder: input.signingOrder === "parallel" ? "PARALLEL" : "SEQUENTIAL",
    roles,
    fields,
  });
}

export function toUpdateSignatureTemplateBody(
  input: SignatureRequest,
): Record<string, unknown> {
  return compactBody({
    name: input.documentName.trim(),
    description: pickStr(input.relatedTo),
    signingOrder: input.signingOrder === "parallel" ? "PARALLEL" : "SEQUENTIAL",
  });
}

export async function listCrmSignatureTemplates(): Promise<SignatureRequest[]> {
  try {
    return normalizeSignatureRequests(await templatesCall("")).map((row) => ({
      ...row,
      recordType: "template" as const,
    }));
  } catch (err) {
    if (isMissingCrmRoute(err)) return [];
    throw err;
  }
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
