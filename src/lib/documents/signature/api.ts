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
  getRequestDocuments,
  getSignatureRequestById,
  PREFILL_RECIPIENT_ID,
  type SignatureField,
  type SignatureRequest,
  type SignatureSigner,
  type SignatureStatus,
  type SignerRole,
  type SignerStatus,
} from "@/lib/documents/signature/types";
import { DEFAULT_PLACED_FIELD_HEIGHT, DEFAULT_PLACED_FIELD_WIDTH } from "@/lib/documents/signature/field-placement";

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
  try {
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
  } catch (err) {
    if (isMissingCrmRoute(err)) return [];
    throw err;
  }
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

function crmRecipientRole(role: SignerRole): string {
  if (role === "Approver") return "APPROVER";
  if (role === "CC") return "CC";
  return "SIGNER";
}

export function toCrmSignatureFieldType(
  kind: string,
): "SIGNATURE" | "INITIALS" | "TEXT" | "DATE" | "CHECKBOX" {
  const value = kind.toLowerCase();
  if (value === "signature") return "SIGNATURE";
  if (value === "initials") return "INITIALS";
  if (value === "date" || value === "sign_date") return "DATE";
  if (value === "checkbox") return "CHECKBOX";
  return "TEXT";
}

function clampUnit(n: number, min = 0.001, max = 1) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function toCrmFieldGeometry(field: SignatureField) {
  const x = field.x <= 1 ? field.x : field.x / 100;
  const y = field.y <= 1 ? field.y : field.y / 100;
  const widthPx =
    field.w > 40 ? field.w : field.w > 0 ? (field.w / 100) * 700 : DEFAULT_PLACED_FIELD_WIDTH;
  const heightPx = field.h > 20 ? field.h : DEFAULT_PLACED_FIELD_HEIGHT;
  const previewHeight = 700 * (792 / 612);
  return {
    x: clampUnit(x, 0, 0.99),
    y: clampUnit(y, 0, 0.99),
    width: clampUnit(widthPx / 700),
    height: clampUnit(heightPx / previewHeight),
    pageNumber: Math.max(1, field.page || 1),
  };
}

export function remapFieldsToRemoteRecipients(
  fields: SignatureField[],
  localSigners: SignatureSigner[],
  remoteSigners: SignatureSigner[],
): SignatureField[] {
  return fields.flatMap((field) => {
    if (field.signerId === PREFILL_RECIPIENT_ID) return [];
    if (isUuid(field.signerId)) return [field];
    const local = localSigners.find((signer) => signer.id === field.signerId);
    const remote =
      (local &&
        remoteSigners.find(
          (row) => row.email.toLowerCase() === local.email.toLowerCase(),
        )) ||
      remoteSigners.find((row) => row.id === field.signerId);
    if (!remote || !isUuid(remote.id)) return [];
    return [{ ...field, signerId: remote.id }];
  });
}

export function toCreateSignatureRequestBody(
  input: SignatureRequest,
  documentId?: string,
): Record<string, unknown> {
  return compactBody({
    documentId: documentId && isUuid(documentId) ? documentId : undefined,
    title: input.documentName.trim(),
    documentName: input.documentName.trim(),
    signingOrder: input.signingOrder === "parallel" ? "PARALLEL" : "SEQUENTIAL",
    expiresAt: toIsoDate(input.expiryDate),
    emailSubject: `Please sign: ${input.documentName.trim()}`,
    recipients: input.signers.map((signer) =>
      compactBody({
        name: signer.name.trim(),
        email: signer.email.trim(),
        role: crmRecipientRole(signer.role),
        phone: signer.phone,
        deliverVia: signer.deliveryMethod === "email_sms" ? "EMAIL_SMS" : "EMAIL",
      }),
    ),
  });
}

export function toPlaceSignatureFieldsBody(input: SignatureRequest) {
  return {
    fields: input.fields.flatMap((field) => {
      if (field.signerId === PREFILL_RECIPIENT_ID || !isUuid(field.signerId)) {
        return [];
      }
      const box = toCrmFieldGeometry(field);
      return [
        compactBody({
          recipientId: field.signerId,
          type: toCrmSignatureFieldType(field.kind),
          pageNumber: box.pageNumber,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          required: field.required,
        }),
      ];
    }),
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

function keepFileUrl(url?: string): string | undefined {
  if (!url || url.startsWith("blob:")) return undefined;
  return url;
}

export function persistRemoteSignatureRequest(row: SignatureRequest | null) {
  if (!row) return row;
  const existing = getSignatureRequestById(row.id);
  if (!existing) {
    upsertSignatureRequest(row, { allowEmptyFields: true });
    return row;
  }
  const existingDocs = getRequestDocuments(existing);
  const remoteDocs = getRequestDocuments(row);
  const documents = (remoteDocs.length ? remoteDocs : existingDocs).map(
    (doc) => {
      const match = existingDocs.find((item) => item.id === doc.id);
      return {
        ...doc,
        fileUrl: keepFileUrl(doc.fileUrl) || match?.fileUrl,
      };
    },
  );
  return upsertSignatureRequest(
    {
      ...existing,
      ...row,
      documents,
      documentFileUrl:
        keepFileUrl(row.documentFileUrl) || existing.documentFileUrl,
      fields: row.fields?.length ? row.fields : existing.fields,
      signers: row.signers?.length ? row.signers : existing.signers,
    },
    { allowEmptyFields: true },
  );
}

export async function syncCrmSignatureDraft(
  draft: SignatureRequest,
  options?: { documentId?: string },
): Promise<SignatureRequest> {
  const documentId = options?.documentId;
  const body = toCreateSignatureRequestBody(draft, documentId);

  async function placeClientFields(id: string, local: SignatureRequest) {
    const remoteSigners =
      (await tryCrmSignatureRequest(() => listCrmSignatureRecipients(id))) ??
      [];
    const fields = remapFieldsToRemoteRecipients(
      local.fields,
      local.signers,
      remoteSigners,
    );
    if (!fields.length) return;
    await tryCrmSignatureRequest(() =>
      placeCrmSignatureFields(id, { ...local, fields }),
    );
  }

  if (isUuid(draft.id)) {
    await tryCrmSignatureRequest(() =>
      updateCrmSignatureRequest(draft.id, body),
    );
    await placeClientFields(draft.id, draft);
    return draft;
  }
  if (!documentId || !isUuid(documentId)) return draft;

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
    documents: getRequestDocuments(draft).map((doc) => ({
      ...doc,
      fileUrl: doc.fileUrl,
    })),
    documentFileUrl: draft.documentFileUrl,
  });
  if (merged && merged.id !== draft.id) {
    const { copyCachedSignatureFiles } = await import(
      "@/lib/documents/signature/file-cache"
    );
    await copyCachedSignatureFiles(
      draft.id,
      merged.id,
      getRequestDocuments(draft).map((doc) => doc.id),
    );
  }
  if (merged) {
    await placeClientFields(merged.id, { ...merged, fields: draft.fields, signers: draft.signers });
  }
  return merged ?? draft;
}

export function isCrmSignatureRequestId(id: string): boolean {
  return isUuid(id);
}
