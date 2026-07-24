/** Proposal-to-payment journey: links Estimate → Quote → E-Sign → Invoice → Payment */

import { formatFinanceAt, formatFinanceDate } from "@/lib/finance/shared";

export type JourneyStatus =
  | "Draft"
  | "Quoted"
  | "AwaitingSignature"
  | "Signed"
  | "Invoiced"
  | "PartiallyPaid"
  | "Paid";

export interface FinanceJourney {
  id: string;
  token: string;
  clientId: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  dealName?: string;
  estimateId?: string;
  quotationId?: string;
  signatureRequestId?: string;
  invoiceId?: string;
  paymentIds: string[];
  status: JourneyStatus;
  createdAt: string;
  updatedAt: string;
}

const STORE_KEY = "finance:journey:v1";

function readStore(): FinanceJourney[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as FinanceJourney[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: FinanceJourney[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

const seedJourneys: FinanceJourney[] = [
  {
    id: "jny1",
    token: "jny-greystone-refinance",
    clientId: "c1",
    clientName: "Greystone Realty",
    contactName: "Priya Mehta",
    contactEmail: "priya@greystone.example",
    dealName: "Greystone refinance package",
    estimateId: "est1",
    quotationId: "quo1",
    signatureRequestId: "sr2",
    invoiceId: "inv1",
    paymentIds: ["pay1"],
    status: "Paid",
    createdAt: "14/07/2026",
    updatedAt: "16/07/2026",
  },
  {
    id: "jny2",
    token: "jny-harbour-packaging",
    clientId: "c2",
    clientName: "Harbour Loans",
    contactName: "Marcus Chen",
    contactEmail: "marcus@harbour.example",
    dealName: "Harbour first-home buyer",
    quotationId: "quo2",
    signatureRequestId: "sr-quo2",
    paymentIds: [],
    status: "AwaitingSignature",
    createdAt: "19/07/2026",
    updatedAt: "19/07/2026",
  },
];

export function listJourneys(): FinanceJourney[] {
  return (
    readStore() ??
    seedJourneys.map((j) => ({ ...j, paymentIds: [...j.paymentIds] }))
  );
}

export function upsertJourney(j: FinanceJourney) {
  const list = listJourneys();
  const i = list.findIndex((x) => x.id === j.id);
  const next = { ...j, updatedAt: formatFinanceDate() };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  writeStore(list);
  return next;
}

export function getJourneyById(id: string) {
  return listJourneys().find((j) => j.id === id);
}

export function getJourneyByToken(token: string) {
  return listJourneys().find((j) => j.token === token);
}

export function getJourneyByQuotationId(quotationId: string) {
  return listJourneys().find((j) => j.quotationId === quotationId);
}

export function getJourneyBySignatureRequestId(signatureRequestId: string) {
  return listJourneys().find((j) => j.signatureRequestId === signatureRequestId);
}

export function publicJourneyPath(token: string) {
  return `/j/${token}`;
}

function slugToken(parts: string[]) {
  return (
    "jny-" +
    parts
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48)
  );
}

/** Ensure a journey exists for this commercial chain (idempotent). */
export function ensureJourneyForQuote(input: {
  quotationId: string;
  clientId: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  dealName?: string;
  estimateId?: string;
  signatureRequestId?: string;
  invoiceId?: string;
  status?: JourneyStatus;
}): FinanceJourney {
  const existing = getJourneyByQuotationId(input.quotationId);
  if (existing) {
    return upsertJourney({
      ...existing,
      estimateId: input.estimateId ?? existing.estimateId,
      signatureRequestId:
        input.signatureRequestId ?? existing.signatureRequestId,
      invoiceId: input.invoiceId ?? existing.invoiceId,
      status: input.status ?? existing.status,
    });
  }

  let token = slugToken([
    input.clientName.split(" ")[0] ?? "client",
    input.dealName?.split(" ")[0] ?? input.quotationId,
  ]);
  const list = listJourneys();
  if (list.some((j) => j.token === token)) {
    token = `${token}-${Date.now().toString(36)}`;
  }

  return upsertJourney({
    id: `jny-${Date.now()}`,
    token,
    clientId: input.clientId,
    clientName: input.clientName,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    dealName: input.dealName,
    estimateId: input.estimateId,
    quotationId: input.quotationId,
    signatureRequestId: input.signatureRequestId,
    invoiceId: input.invoiceId,
    paymentIds: [],
    status: input.status ?? "Quoted",
    createdAt: formatFinanceDate(),
    updatedAt: formatFinanceDate(),
  });
}

export function touchJourneyStatus(
  quotationId: string,
  status: JourneyStatus,
  patch?: Partial<FinanceJourney>,
) {
  const j = getJourneyByQuotationId(quotationId);
  if (!j) return null;
  return upsertJourney({ ...j, ...patch, status });
}

export function journeyStatusLabel(s: JourneyStatus) {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export { formatFinanceAt };
