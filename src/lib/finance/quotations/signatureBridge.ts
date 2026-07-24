/** Quote ↔ §9.3 e-signature bridge for proposal-to-payment */

import {
  formatAuditAt,
  getSignatureRequestById,
  nextSignatureIds,
  upsertSignatureRequest,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
import {
  appendQuotationAudit,
  getQuotationById,
  listQuotations,
  upsertQuotation,
  type Quotation,
} from "@/lib/finance/quotations/types";
import {
  ensureJourneyForQuote,
  touchJourneyStatus,
} from "@/lib/finance/journey/types";
import { formatFinanceAt, formatFinanceDate } from "@/lib/finance/shared";

function expiryPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function publicSignPath(token: string) {
  return `/sign/${token}`;
}

function findQuoteBySignatureId(signatureRequestId: string) {
  return listQuotations().find((q) => q.signatureRequestId === signatureRequestId);
}

function createSignatureFromQuote(
  quote: Quotation,
  fresh: { id: string; signatureRequestId: string; manageToken: string },
): SignatureRequest {
  return upsertSignatureRequest({
    id: fresh.id,
    signatureRequestId: fresh.signatureRequestId,
    documentName: `Engagement: ${quote.title}`,
    documentFile: `${quote.quotationId}_Contract.pdf`,
    signer: quote.contactName,
    signerEmail: quote.contactEmail,
    relatedTo: `Quotation: ${quote.quotationId}`,
    relatedQuotationId: quote.id,
    status: "Sent",
    sentDate: formatFinanceDate(),
    expiryDate: quote.validUntil || expiryPlusDays(14),
    createdBy: quote.owner,
    manageToken: fresh.manageToken,
    audit: [
      {
        id: `a-${Date.now()}`,
        at: formatAuditAt(),
        action: "Created from quotation",
        actor: quote.owner,
      },
      {
        id: `a-send-${Date.now()}`,
        at: formatAuditAt(),
        action: "Sent for signature",
        actor: quote.owner,
      },
    ],
  });
}

/** Create or resend a real §9.3 signature request from a quotation. */
export function sendQuotationContract(quote: Quotation): {
  quotation: Quotation;
  signature: SignatureRequest;
  signUrl: string;
} {
  let signature: SignatureRequest;

  if (quote.signatureRequestId) {
    const existing = getSignatureRequestById(quote.signatureRequestId);
    if (existing && existing.status !== "Signed") {
      signature = upsertSignatureRequest({
        ...existing,
        status: "Sent",
        sentDate: formatFinanceDate(),
        signer: quote.contactName,
        signerEmail: quote.contactEmail,
        relatedTo: `Quotation: ${quote.quotationId}`,
        relatedQuotationId: quote.id,
        audit: [
          ...existing.audit,
          {
            id: `a-resend-${Date.now()}`,
            at: formatAuditAt(),
            action: "Resent for signature",
            actor: quote.owner,
          },
        ],
      });
    } else {
      signature = createSignatureFromQuote(quote, nextSignatureIds());
    }
  } else {
    signature = createSignatureFromQuote(quote, nextSignatureIds());
  }

  let quotation = appendQuotationAudit(
    {
      ...quote,
      signatureStatus: "Pending",
      signatureRequestId: signature.id,
      signatureToken: signature.manageToken,
      status: quote.status === "Draft" ? "Sent" : quote.status,
      sentAt: quote.sentAt ?? formatFinanceAt(),
    },
    `Contract sent for signature (${signature.signatureRequestId})`,
  );
  quotation = upsertQuotation(quotation);

  ensureJourneyForQuote({
    quotationId: quotation.id,
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    contactName: quotation.contactName,
    contactEmail: quotation.contactEmail,
    dealName: quotation.dealName,
    estimateId: quotation.estimateId,
    signatureRequestId: signature.id,
    invoiceId: quotation.invoiceId,
    status: "AwaitingSignature",
  });

  return {
    quotation,
    signature,
    signUrl: publicSignPath(signature.manageToken),
  };
}

/** When a §9.3 request is signed/declined, sync the linked quotation + journey. */
export function syncQuotationFromSignature(signature: SignatureRequest) {
  const quotationId =
    signature.relatedQuotationId ??
    findQuoteBySignatureId(signature.id)?.id;
  if (!quotationId) return null;

  const quote = getQuotationById(quotationId);
  if (!quote) return null;

  if (signature.status === "Signed") {
    const next = upsertQuotation(
      appendQuotationAudit(
        {
          ...quote,
          signatureStatus: "Signed",
          status: quote.status === "Invoiced" ? "Invoiced" : "Accepted",
          signatureRequestId: signature.id,
          signatureToken: signature.manageToken,
        },
        "Contract signed",
        signature.signer,
      ),
    );
    touchJourneyStatus(next.id, "Signed", {
      signatureRequestId: signature.id,
    });
    return next;
  }

  if (signature.status === "Declined") {
    const next = upsertQuotation(
      appendQuotationAudit(
        {
          ...quote,
          signatureStatus: "Not sent",
          status: quote.status === "Invoiced" ? "Invoiced" : "Rejected",
        },
        "Contract declined",
        signature.signer,
      ),
    );
    touchJourneyStatus(next.id, "Quoted", {
      signatureRequestId: signature.id,
    });
    return next;
  }

  return quote;
}
