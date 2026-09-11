import {
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  makeSigner,
  upsertSignatureRequest,
  deleteSignatureRequest,
  type SignatureRequest,
  type SignatureSigner,
  type SignatureStatus,
  type SignerRole,
  type SignerStatus,
} from "@/lib/documents/signature/types";

export type CrmSignatureRequestQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function workspaceSignatureRequestsPath(
  workspaceId: string,
  suffix = "",
): string {
  return `/v1/workspaces/${workspaceId}/signature-requests${suffix}`;
}

export function globalSignatureRequestsPath(suffix = ""): string {
  return `/v1/signature-requests${suffix}`;
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of [
      "items",
      "signatureRequests",
      "requests",
      "records",
      "rows",
      "result",
    ]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

function formatDisplayDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU");
}

function toIsoDate(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const au = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (au) {
    const [, day, month, year] = au;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw.trim())) return raw.trim().slice(0, 10);
  return raw.trim();
}

export function mapSignatureStatus(raw: string): SignatureStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("expir")) return "Expired";
  if (value.includes("declin")) return "Declined";
  if (value.includes("sign")) return "Signed";
  if (value.includes("view")) return "Viewed";
  if (value.includes("sent") || value.includes("send")) return "Sent";
  return "Draft";
}

export function apiSignatureStatus(status: SignatureStatus): string {
  return status.toUpperCase();
}

function mapSignerRole(raw: string): SignerRole {
  const value = raw.toLowerCase();
  if (value.includes("approv")) return "Approver";
  if (value.includes("cc") || value.includes("copy")) return "CC";
  return "Signer";
}

function mapSignerStatus(raw: string): SignerStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("declin")) return "Declined";
  if (value.includes("sign")) return "Signed";
  if (value.includes("view")) return "Viewed";
  if (value.includes("sent") || value.includes("send")) return "Sent";
  return "Pending";
}

function mapSigners(raw: unknown): SignatureSigner[] {
  const rows = extractRecords(raw);
  return rows.map((row, index) =>
    makeSigner({
      id: pickStr(row.id, row.signerId) || `sg-${index + 1}`,
      name: pickStr(row.name, row.fullName, row.email, "Signer"),
      email: pickStr(row.email, row.signerEmail),
      order: typeof row.order === "number" ? row.order : index + 1,
      token: pickStr(row.token, row.manageToken) || `sig-${index + 1}`,
      role: mapSignerRole(pickStr(row.role, "SIGNER")),
      status: mapSignerStatus(pickStr(row.status, "PENDING")),
      signedAt: formatDisplayDate(row.signedAt) || undefined,
      signatureData: pickStr(row.signatureData) || undefined,
    }),
  );
}

export function normalizeSignatureRequestRemote(
  raw: Record<string, unknown>,
  index: number,
): SignatureRequest {
  const signers = mapSigners(raw.signers ?? raw.recipients ?? raw.actors);
  const primary = signers[0];
  const id = pickStr(raw.id, raw.uuid) || `crm-sr-${index}`;
  const documentName = pickStr(
    raw.documentName,
    raw.title,
    raw.name,
    raw.subject,
    "Signature request",
  );
  return {
    id,
    signatureRequestId: pickStr(
      raw.number,
      raw.code,
      raw.reference,
      raw.signatureRequestId,
      `ES-${index + 1}`,
    ),
    documentName,
    documentFile: pickStr(raw.fileName, raw.documentFile, raw.file, `${documentName}.pdf`),
    documentFileUrl: pickStr(raw.fileUrl, raw.documentUrl, raw.url) || undefined,
    recordType: pickStr(raw.recordType).toLowerCase() === "template" ? "template" : "document",
    signer: primary?.name ?? pickStr(raw.signerName, raw.signer, "—"),
    signerEmail: primary?.email ?? pickStr(raw.signerEmail, raw.email),
    signers: signers.length
      ? signers
      : [
          makeSigner({
            id: `sg-${id}`,
            name: pickStr(raw.signerName, raw.signer, "Signer"),
            email: pickStr(raw.signerEmail, raw.email),
            order: 1,
            token: pickStr(raw.manageToken, raw.token) || `sig-${id}`,
          }),
        ],
    fields: [],
    signingOrder:
      pickStr(raw.signingOrder, raw.orderMode).toLowerCase() === "parallel"
        ? "parallel"
        : "sequential",
    relatedTo: pickStr(raw.relatedTo, raw.relatedLabel) || undefined,
    status: mapSignatureStatus(pickStr(raw.status, raw.state, "DRAFT")),
    sentDate: formatDisplayDate(raw.sentDate ?? raw.sentAt) || undefined,
    signedDate: formatDisplayDate(raw.signedDate ?? raw.signedAt) || undefined,
    expiryDate: formatDisplayDate(raw.expiryDate ?? raw.expiresAt) || "",
    createdBy: pickStr(raw.createdBy, raw.ownerName, raw.owner, "—"),
    manageToken: pickStr(raw.manageToken, raw.token, primary?.token) || `sig-${id}`,
    audit: [],
    updatedAt: pickStr(raw.updatedAt) || undefined,
  };
}

export function normalizeSignatureRequests(data: unknown): SignatureRequest[] {
  return extractRecords(data).map((row, index) =>
    normalizeSignatureRequestRemote(row, index),
  );
}

async function withSession<T>(
  run: (session: CrmSession) => Promise<T>,
): Promise<T> {
  const session = await ensureCrmSession();
  if (!session) throw new Error("Sign in to manage signature requests");
  return run(session);
}

function isMissingCrmRoute(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /\(404\)|not found/i.test(message);
}

async function requestsCall(
  suffix: string,
  query = "",
  init?: RequestInit,
): Promise<unknown> {
  const scoped = await ensureCrmSession();
  const paths = [
    ...(scoped?.workspaceId
      ? [`${workspaceSignatureRequestsPath(scoped.workspaceId, suffix)}${query}`]
      : []),
    `${globalSignatureRequestsPath(suffix)}${query}`,
  ].filter((path, index, all) => all.indexOf(path) === index);

  let lastError: unknown;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      if (isBoundCrmSession()) {
        return await withSession((session) => crmFetch(session, paths[i], init));
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

async function requestsGet(suffix: string, query = ""): Promise<unknown> {
  return requestsCall(suffix, query);
}

async function requestsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  return requestsCall(suffix, "", init);
}

function asRequest(data: unknown): SignatureRequest | null {
  const items = normalizeSignatureRequests(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeSignatureRequestRemote(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmSignatureRequests(
  query: CrmSignatureRequestQuery = {},
): Promise<SignatureRequest[]> {
  return normalizeSignatureRequests(
    await requestsGet(
      "",
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmSignatureRequest(
  id: string,
): Promise<SignatureRequest | null> {
  return asRequest(await requestsGet(`/${id}`));
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

export function toCreateSignatureRequestBody(
  input: SignatureRequest,
): Record<string, unknown> {
  return compactBody({
    title: input.documentName.trim(),
    documentName: input.documentName.trim(),
    signingOrder: input.signingOrder.toUpperCase(),
    expiresAt: toIsoDate(input.expiryDate),
    recipients: input.signers.map((signer) =>
      compactBody({
        name: signer.name.trim(),
        email: signer.email.trim(),
        role: signer.role.toUpperCase(),
        order: signer.order,
      }),
    ),
  });
}

export function toPlaceSignatureFieldsBody(input: SignatureRequest) {
  return {
    fields: input.fields.map((field) =>
      compactBody({
        id: field.id,
        type: field.kind.toUpperCase(),
        kind: field.kind.toUpperCase(),
        label: field.label,
        page: field.page || 1,
        x: field.x,
        y: field.y,
        width: field.w,
        height: field.h,
        signerId: field.signerId,
        required: field.required,
        documentId: field.documentId,
      }),
    ),
  };
}

export async function createCrmSignatureRequest(
  body: Record<string, unknown>,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmSignatureRequest(
  id: string,
  patch: Record<string, unknown>,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmSignatureRequest(id: string): Promise<void> {
  await requestsMutate(`/${id}`, { method: "DELETE" });
}

export async function sendCrmSignatureRequest(
  id: string,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/send`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function viewCrmSignatureRequest(
  id: string,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/view`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function signCrmSignatureRequest(
  id: string,
  body: Record<string, unknown> = {},
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/sign`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function declineCrmSignatureRequest(
  id: string,
  body: Record<string, unknown> = {},
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/decline`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function downloadCrmSignatureRequest(
  id: string,
): Promise<{ url: string | null }> {
  const data = await requestsGet(`/${id}/download`);
  if (typeof data === "string" && data.trim()) {
    return { url: data.trim() };
  }
  const rec =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    url:
      pickStr(rec.url, rec.downloadUrl, rec.href, rec.signedUrl, rec.location) ||
      null,
  };
}

export async function listCrmSignatureRecipients(
  id: string,
): Promise<SignatureSigner[]> {
  return mapSigners(await requestsGet(`/${id}/recipients`));
}

export async function listCrmSignatureFields(id: string) {
  return extractRecords(await requestsGet(`/${id}/fields`));
}

export async function placeCrmSignatureFields(
  id: string,
  input: SignatureRequest,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/fields`, {
      method: "PUT",
      body: JSON.stringify(toPlaceSignatureFieldsBody(input)),
    }),
  );
}

export async function remindCrmSignatureRequest(
  id: string,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/${id}/remind`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function selfSignCrmSignatureRequest(
  body: Record<string, unknown>,
): Promise<SignatureRequest | null> {
  return asRequest(
    await requestsMutate(`/self-sign`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function tryCrmSignatureRequest<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteSignatureRequest(row: SignatureRequest | null) {
  if (row) upsertSignatureRequest(row, { allowEmptyFields: true });
  return row;
}

export async function syncCrmSignatureDraft(
  draft: SignatureRequest,
): Promise<SignatureRequest> {
  const body = toCreateSignatureRequestBody(draft);
  if (isUuid(draft.id)) {
    await tryCrmSignatureRequest(() =>
      updateCrmSignatureRequest(draft.id, body),
    );
    if (draft.fields.length) {
      await tryCrmSignatureRequest(() =>
        placeCrmSignatureFields(draft.id, draft),
      );
    }
    return draft;
  }
  const remote = await tryCrmSignatureRequest(() =>
    createCrmSignatureRequest(body),
  );
  if (!remote) return draft;
  deleteSignatureRequest(draft.id);
  const merged = persistRemoteSignatureRequest({
    ...draft,
    ...remote,
    fields: draft.fields,
    signers: draft.signers.length ? draft.signers : remote.signers,
    recordType: draft.recordType ?? "document",
  });
  if (merged && draft.fields.length) {
    await tryCrmSignatureRequest(() =>
      placeCrmSignatureFields(merged.id, { ...merged, fields: draft.fields }),
    );
  }
  return merged ?? draft;
}

export function isCrmSignatureRequestId(id: string): boolean {
  return isUuid(id);
}
