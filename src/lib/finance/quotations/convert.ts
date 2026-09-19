/** Quotation → Sales Invoice conversion (SRS §13.4 / §20.3). */

import {
  appendQuotationAudit,
  upsertQuotation,
  type Quotation,
} from "@/lib/finance/quotations/types";
import {
  appendInvoiceAudit,
  getInvoiceById,
  nextInvoiceIds,
  upsertInvoice,
  type Invoice,
} from "@/lib/finance/invoices/types";
import {
  ensureJourneyForQuote,
  touchJourneyStatus,
} from "@/lib/finance/journey/types";
import { formatFinanceDate } from "@/lib/finance/shared";

export type ConvertQuoteResult = {
  quotation: Quotation;
  invoice: Invoice;
  created: boolean;
};

/**
 * Create a Draft sales invoice from a signed/accepted quotation.
 * Idempotent: if `quotation.invoiceId` already points at an invoice, returns it.
 */
export function createInvoiceFromQuotation(
  quote: Quotation,
  actor = quote.owner,
): ConvertQuoteResult {
  if (quote.invoiceId) {
    const existing = getInvoiceById(quote.invoiceId);
    if (existing) {
      return { quotation: quote, invoice: existing, created: false };
    }
  }

  const ids = nextInvoiceIds();
  const invoice = upsertInvoice(
    appendInvoiceAudit(
      {
        id: ids.id,
        invoiceId: ids.invoiceId,
        title:
          quote.title.replace(/quotation/i, "invoice") ||
          `${quote.title} invoice`,
        status: "Draft",
        clientId: quote.clientId,
        clientName: quote.clientName,
        contactName: quote.contactName,
        contactEmail: quote.contactEmail,
        dealName: quote.dealName,
        owner: quote.owner,
        issueDate: formatFinanceDate(),
        dueDate: quote.validUntil,
        notes: quote.notes,
        lineItems: quote.lineItems.map((l) => ({ ...l, id: `ili-${l.id}` })),
        subtotal: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        amountDue: 0,
        quotationId: quote.id,
        quotationRef: quote.quotationId,
        createdBy: actor,
        createdAt: formatFinanceDate(),
        audit: [],
      },
      "Created from quotation",
      actor,
    ),
  );

  const quotation = upsertQuotation(
    appendQuotationAudit(
      { ...quote, status: "Invoiced", invoiceId: invoice.id },
      "Converted to invoice",
      actor,
    ),
  );

  ensureJourneyForQuote({
    quotationId: quotation.id,
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    contactName: quotation.contactName,
    contactEmail: quotation.contactEmail,
    dealName: quotation.dealName,
    estimateId: quotation.estimateId,
    signatureRequestId: quotation.signatureRequestId,
    invoiceId: invoice.id,
    status: "Invoiced",
  });
  touchJourneyStatus(quotation.id, "Invoiced", { invoiceId: invoice.id });

  return { quotation, invoice, created: true };
}
