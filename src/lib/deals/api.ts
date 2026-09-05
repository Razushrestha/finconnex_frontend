import {
  decodeJwtPayload,
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  DEAL_PIPELINE_STAGES,
  type DealCurrency,
  type DealPipeline,
  type DealRecord,
  type DealStage,
  type DealStageTitle,
} from "@/lib/deals/types";

export type CrmDealQuery = {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
};

export type CrmDealForecast = {
  expected: number;
  actual: number;
  raw: unknown;
};

export type CrmDealContact = {
  id: string;
  contactId: string;
  name: string;
  role?: string;
};

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-violet-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return 0;
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

export function dealsPath(suffix = ""): string {
  return `/v1/deals${suffix}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function compactBody(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}

async function dealsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (isBoundCrmSession()) {
    const scoped = await ensureCrmSession();
    if (scoped) return crmFetch<T>(scoped, path, init);
    const access = await ensureCrmAccess();
    if (!access) throw new Error("Sign in to load deals");
    return crmFetch<T>(access, path, init);
  }
  return crmBffFetch<T>(path, init);
}

async function dealsGet(suffix: string, query = ""): Promise<unknown> {
  return dealsFetch(`${dealsPath(suffix)}${query}`);
}

async function dealsMutate(suffix: string, init: RequestInit): Promise<unknown> {
  return dealsFetch(dealsPath(suffix), init);
}

async function jwtOwnerId(): Promise<string | undefined> {
  try {
    const access = await ensureCrmAccess();
    const claims = access?.accessToken
      ? decodeJwtPayload(access.accessToken)
      : null;
    const id = claims?.sub ?? claims?.userId ?? claims?.id;
    return typeof id === "string" && isUuid(id) ? id : undefined;
  } catch {
    return undefined;
  }
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
    for (const key of ["items", "deals", "cards", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

export function mapDealStageTitle(raw: string): DealStageTitle {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("won")) return "Closed Won";
  if (value.includes("lost")) return "Closed Lost";
  if (value.includes("negot") || value.includes("contract")) return "Negotiation";
  if (value.includes("propos")) return "Proposal";
  if (value.includes("qualif")) return "Qualification";
  return "Prospecting";
}

export function apiDealStage(title: string): string {
  const value = title.toLowerCase();
  if (value.includes("won")) return "CLOSED_WON";
  if (value.includes("lost")) return "CLOSED_LOST";
  if (value.includes("contract")) return "CONTRACT_SENT";
  if (value.includes("negot")) return "NEGOTIATION";
  if (value.includes("propos")) return "PROPOSAL";
  if (value.includes("qualif")) return "QUALIFICATION";
  return "PROSPECTING";
}

function formatMoney(raw: unknown): string {
  const n = toNum(raw);
  if (!n) {
    const text = pickStr(raw);
    return text.startsWith("$") ? text : text ? `$${text}` : "$0";
  }
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatClose(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/);
  return (
    (words[0]?.[0] ?? "D") + (words[1]?.[0] ?? words[0]?.[1] ?? "L")
  ).toUpperCase();
}

const STAGE_STYLE = Object.fromEntries(
  DEAL_PIPELINE_STAGES.Deals.map((s) => [s.title, s]),
) as Record<string, DealStage>;

export function normalizeDeal(
  raw: Record<string, unknown>,
  index: number,
): DealRecord & { stageTitle: DealStageTitle } {
  const company =
    raw.company && typeof raw.company === "object"
      ? (raw.company as Record<string, unknown>)
      : null;
  const contact =
    raw.contact && typeof raw.contact === "object"
      ? (raw.contact as Record<string, unknown>)
      : raw.primaryContact && typeof raw.primaryContact === "object"
        ? (raw.primaryContact as Record<string, unknown>)
        : null;
  const name = pickStr(raw.name, raw.title, raw.dealName, `Deal ${index + 1}`);
  const stageTitle = mapDealStageTitle(
    pickStr(raw.stage, raw.status, raw.pipelineStage, "PROSPECTING"),
  );
  const style = STAGE_STYLE[stageTitle] ?? DEAL_PIPELINE_STAGES.Deals[0];
  return {
    id: pickStr(raw.id, raw.uuid, raw.dealId) || `crm-deal-${index}`,
    name,
    initials: initialsFrom(name),
    account: pickStr(
      company && pickStr(company.name, company.title),
      raw.account,
      raw.companyName,
      raw.accountName,
      "—",
    ),
    contact:
      pickStr(
        contact && pickStr(contact.name, contact.fullName),
        raw.contactName,
        raw.contact,
      ) || undefined,
    contactId:
      pickStr(contact && contact.id, raw.contactId, raw.primaryContactId) ||
      undefined,
    value: formatMoney(raw.value ?? raw.amount ?? raw.pipelineValue),
    currency: (pickStr(raw.currency, "AUD").toUpperCase() ||
      "AUD") as DealCurrency,
    probability: toNum(raw.probability ?? raw.winProbability) || style.deals[0]?.probability || 10,
    owner: pickStr(raw.ownerName, raw.owner, raw.createdBy, "—"),
    closeDate: formatClose(
      raw.expectedCloseDate ?? raw.closeDate ?? raw.actualCloseDate,
    ),
    accentColorClass: style.dotColorClass,
    avatarBgClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
    stageTitle,
  };
}

function asDeal(data: unknown): (DealRecord & { stageTitle: DealStageTitle }) | null {
  const rows = extractRecords(data);
  if (rows[0]) return normalizeDeal(rows[0], 0);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeDeal(data as Record<string, unknown>, 0);
  }
  return null;
}

export function emptyDealPipelines(): Record<DealPipeline, DealStage[]> {
  const out = {} as Record<DealPipeline, DealStage[]>;
  for (const [pipe, stages] of Object.entries(DEAL_PIPELINE_STAGES) as [
    DealPipeline,
    DealStage[],
  ][]) {
    out[pipe] = stages.map((s) => ({ ...s, deals: [] }));
  }
  return out;
}

export function boardFromDeals(
  deals: Array<DealRecord & { stageTitle?: string }>,
): Record<DealPipeline, DealStage[]> {
  const board = emptyDealPipelines();
  const stages = board.Deals;
  for (const [index, deal] of deals.entries()) {
    const title = deal.stageTitle ?? "Prospecting";
    const target =
      stages.find((s) => s.title === title) ??
      stages.find((s) => s.title === mapDealStageTitle(title)) ??
      stages[0];
    if (!target) continue;
    target.deals.push({
      ...deal,
      accentColorClass: target.dotColorClass,
      avatarBgClass: AVATAR_COLORS[index % AVATAR_COLORS.length],
    });
  }
  return board;
}

function stagesFromUnknown(data: unknown): DealStage[] | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const rawStages = rec.stages ?? rec.columns ?? rec.pipeline;
  const list = Array.isArray(rawStages)
    ? rawStages
    : rawStages && typeof rawStages === "object"
      ? extractRecords((rawStages as Record<string, unknown>).stages)
      : [];
  if (!list.length) return null;
  return list.map((row, index) => {
    const title = mapDealStageTitle(
      pickStr(row.title, row.name, row.stage, row.status, "Prospecting"),
    );
    const style = STAGE_STYLE[title] ?? DEAL_PIPELINE_STAGES.Deals[index] ?? DEAL_PIPELINE_STAGES.Deals[0];
    const cards = extractRecords(row.deals ?? row.cards ?? row.items ?? row.records);
    return {
      id: pickStr(row.id, style.id, `stage-${index}`),
      title: style.title,
      dotColorClass: style.dotColorClass,
      deals: cards.map((card, i) => {
        const mapped = normalizeDeal({ ...card, stage: title }, i);
        return {
          id: mapped.id,
          name: mapped.name,
          initials: mapped.initials,
          account: mapped.account,
          contact: mapped.contact,
          contactId: mapped.contactId,
          value: mapped.value,
          currency: mapped.currency,
          probability: mapped.probability,
          owner: mapped.owner,
          closeDate: mapped.closeDate,
          accentColorClass: style.dotColorClass,
          avatarBgClass: mapped.avatarBgClass,
        };
      }),
    };
  });
}

export async function listCrmDeals(
  query: CrmDealQuery = {},
): Promise<Array<DealRecord & { stageTitle: DealStageTitle }>> {
  return extractRecords(
    await dealsGet(
      "",
      toQuery({
        page: query.page ?? 1,
        limit: Math.min(100, query.limit ?? 100),
        search: query.search,
        stage: query.stage,
      }),
    ),
  ).map((row, index) => normalizeDeal(row, index));
}

export async function getCrmDealPipeline(opts?: {
  currency?: string;
  pipeline?: string;
}): Promise<Record<DealPipeline, DealStage[]> | null> {
  const data = await dealsGet("/pipeline", toQuery({
      pipeline: opts?.pipeline ?? "default",
      currency: (opts?.currency ?? "AUD").toUpperCase(),
      cardLimit: 50,
    }),
  );
  const stages = stagesFromUnknown(data);
  if (!stages?.length) return null;
  const board = emptyDealPipelines();
  board.Deals = DEAL_PIPELINE_STAGES.Deals.map((seed) => {
    const hits = stages.filter((s) => s.title === seed.title);
    return hits.length
      ? { ...seed, deals: hits.flatMap((s) => s.deals) }
      : { ...seed, deals: [] };
  });
  return board;
}

function forecastRange(): { from: string; to: string } {
  const year = new Date().getUTCFullYear();
  return {
    from: `${year}-01-01T00:00:00.000Z`,
    to: `${year}-12-31T23:59:59.000Z`,
  };
}

export async function getCrmDealForecast(): Promise<CrmDealForecast> {
  const range = forecastRange();
  const data = await dealsGet("/forecast", toQuery(range));
  const rec =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    expected: toNum(
      rec.expected ??
        rec.expectedClose ??
        rec.weighted ??
        rec.openWeightedValue ??
        rec.totalWeightedValue ??
        rec.openValue,
    ),
    actual: toNum(
      rec.actual ?? rec.actualClose ?? rec.won ?? rec.wonValue ?? rec.closedWonValue,
    ),
    raw: data,
  };
}

function mergeDealBoards(
  base: Record<DealPipeline, DealStage[]>,
  extra: Record<DealPipeline, DealStage[]> | null,
): Record<DealPipeline, DealStage[]> {
  if (!extra) return base;
  const seen = new Set(
    Object.values(base).flatMap((stages) =>
      stages.flatMap((stage) => stage.deals.map((deal) => deal.id)),
    ),
  );
  for (const stages of Object.values(extra)) {
    for (const stage of stages) {
      const target =
        base.Deals.find((column) => column.title === stage.title) ??
        base.Deals[0];
      if (!target) continue;
      for (const deal of stage.deals) {
        if (seen.has(deal.id)) continue;
        seen.add(deal.id);
        target.deals.push({
          ...deal,
          accentColorClass: target.dotColorClass,
        });
      }
    }
  }
  return base;
}

export async function loadCrmDealsBoard(): Promise<Record<DealPipeline, DealStage[]>> {
  const listed = await listCrmDeals();
  let board = boardFromDeals(listed);
  for (const currency of ["AUD", "USD"]) {
    try {
      board = mergeDealBoards(
        board,
        await getCrmDealPipeline({ currency }),
      );
    } catch {
      /* list is enough when a currency-scoped pipeline 400s */
    }
  }
  return board;
}

export async function getCrmDeal(
  id: string,
): Promise<(DealRecord & { stageTitle: DealStageTitle }) | null> {
  return asDeal(await dealsGet(`/${id}`));
}

function mapDealSource(raw?: string): string | undefined {
  const value = raw?.trim().toLowerCase() ?? "";
  if (!value) return undefined;
  if (value.includes("refer")) return "REFERRAL";
  if (value.includes("social")) return "SOCIAL_MEDIA";
  if (value.includes("email")) return "EMAIL_CAMPAIGN";
  if (value.includes("cold")) return "COLD_CALL";
  if (value.includes("paid") || value.includes("ad")) return "PAID_AD";
  if (value.includes("event")) return "EVENT";
  if (value.includes("partner")) return "PARTNER";
  if (value.includes("web")) return "WEBSITE";
  if (value.includes("other")) return "OTHER";
  return undefined;
}

function mapLostReason(raw?: string): string | undefined {
  const value = raw?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (!value) return undefined;
  if (value.includes("price")) return "PRICE";
  if (value.includes("feature")) return "FEATURE";
  if (value.includes("competitor")) return "COMPETITOR";
  if (value.includes("budget")) return "NO_BUDGET";
  if (value.includes("response")) return "NO_RESPONSE";
  return "OTHER";
}

export function toCreateDealBody(input: {
  name: string;
  account?: string;
  companyId?: string;
  contact?: string;
  contactId?: string;
  stage?: string;
  value?: string;
  currency?: string;
  probability?: number;
  owner?: string;
  ownerId?: string;
  closeDate?: string;
  source?: string;
  description?: string;
  lostReason?: string;
  competitor?: string;
}): Record<string, unknown> {
  const amount = toNum(input.value);
  const close = input.closeDate?.trim();
  const companyId =
    input.companyId && isUuid(input.companyId)
      ? input.companyId
      : input.account && isUuid(input.account)
        ? input.account
        : undefined;
  const currency = input.currency?.trim().toUpperCase();
  return compactBody({
    name: input.name.trim(),
    stage: input.stage ? apiDealStage(input.stage) : undefined,
    value: input.value?.trim() ? amount.toFixed(2) : undefined,
    currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    probability:
      input.probability == null
        ? undefined
        : Math.min(100, Math.max(0, Math.round(input.probability))),
    expectedCloseDate: close
      ? close.includes("T")
        ? close
        : /^\d{4}-\d{2}-\d{2}/.test(close)
          ? `${close.slice(0, 10)}T00:00:00.000Z`
          : undefined
      : undefined,
    source: mapDealSource(input.source),
    description: input.description?.trim(),
    lostReason: mapLostReason(input.lostReason),
    competitor: input.competitor?.trim(),
    companyId,
    ownerId: input.ownerId && isUuid(input.ownerId) ? input.ownerId : undefined,
  });
}

export async function createCrmDeal(
  body: Record<string, unknown>,
): Promise<(DealRecord & { stageTitle: DealStageTitle }) | null> {
  const ownerId =
    (typeof body.ownerId === "string" && isUuid(body.ownerId)
      ? body.ownerId
      : undefined) ?? (await jwtOwnerId());
  const payload = compactBody({ ...body, ownerId });
  try {
    return asDeal(
      await dealsMutate("", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  } catch (err) {
    if (!payload.ownerId) throw err;
    const { ownerId: _ignored, ...withoutOwner } = payload;
    void _ignored;
    return asDeal(
      await dealsMutate("", {
        method: "POST",
        body: JSON.stringify(withoutOwner),
      }),
    );
  }
}

export async function updateCrmDeal(
  id: string,
  patch: Record<string, unknown>,
): Promise<(DealRecord & { stageTitle: DealStageTitle }) | null> {
  return asDeal(
    await dealsMutate(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmDeal(id: string): Promise<void> {
  await dealsMutate(`/${id}`, { method: "DELETE" });
}

export async function restoreCrmDeal(
  id: string,
): Promise<(DealRecord & { stageTitle: DealStageTitle }) | null> {
  return asDeal(
    await dealsMutate(`/${id}/restore`, { method: "POST", body: "{}" }),
  );
}

export async function cloneCrmDeal(
  id: string,
): Promise<(DealRecord & { stageTitle: DealStageTitle }) | null> {
  return asDeal(
    await dealsMutate(`/${id}/clone`, { method: "POST", body: "{}" }),
  );
}

export async function bulkCrmDeals(body: Record<string, unknown>): Promise<unknown> {
  return dealsMutate("/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listCrmDealContacts(id: string): Promise<CrmDealContact[]> {
  return extractRecords(await dealsGet(`/${id}/contacts`)).map((row, index) => {
    const contact =
      row.contact && typeof row.contact === "object"
        ? (row.contact as Record<string, unknown>)
        : null;
    const contactId = pickStr(contact && contact.id, row.contactId, row.id);
    return {
      id: pickStr(row.id, contactId) || `dc-${index}`,
      contactId,
      name: pickStr(
        contact && pickStr(contact.name, contact.fullName),
        row.name,
        row.contactName,
        "Contact",
      ),
      role: pickStr(row.role, row.contactRole) || undefined,
    };
  });
}

export async function addCrmDealContact(
  id: string,
  body: { contactId: string; role?: string },
): Promise<unknown> {
  return dealsMutate(`/${id}/contacts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function replaceCrmDealContacts(
  id: string,
  contacts: Array<{ contactId: string; role?: string }>,
): Promise<unknown> {
  return dealsMutate(`/${id}/contacts`, {
    method: "PUT",
    body: JSON.stringify({ contacts, items: contacts }),
  });
}

export async function updateCrmDealContactRole(
  id: string,
  contactId: string,
  role: string,
): Promise<unknown> {
  return dealsMutate(`/${id}/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeCrmDealContact(
  id: string,
  contactId: string,
): Promise<void> {
  await dealsMutate(`/${id}/contacts/${contactId}`, { method: "DELETE" });
}

export async function tryCrmDeal<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function isCrmDealId(id: string): boolean {
  return isUuid(id);
}
