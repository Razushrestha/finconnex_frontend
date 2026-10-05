import { describe, expect, it } from "vitest";
import {
  estimatesPath,
  mapEstimateStatus,
  normalizeEstimate,
  toCreateEstimateBody,
} from "@/lib/finance/estimates/api";
import {
  mapCreditNoteStatus,
  normalizeCreditNote,
  creditNotesPath,
} from "@/lib/finance/credit-notes/api";
import {
  mapInvoiceStatus,
  normalizeInvoice,
  invoicesPath,
} from "@/lib/finance/invoices/api";
import {
  mapQuoteStatus,
  normalizeQuote,
  quotesPath,
} from "@/lib/finance/quotations/api";
import {
  mapPaymentStatus,
  mapPaymentMethod,
  normalizePayment,
  paymentsPath,
} from "@/lib/finance/payments/api";
import {
  mapProductStatus,
  mapProductType,
  normalizeProduct,
  productsPath,
} from "@/lib/finance/products/api";
import {
  appPublicSalesPath,
  normalizePublicSalesDocument,
  parsePublicSalesLink,
  publicSalesPath,
  rewritePublicSalesUrl,
} from "@/lib/finance/public-sales/api";
import { financeLiveNote, isFinanceLiveOk } from "@/lib/finance/smoke-live";
import {
  financeInWindow,
  financeMatchesQuery,
  financeOwnerName,
  splitFinanceNotes,
} from "@/lib/finance/shared";
import { toCreateProductBody, toUpdateProductBody } from "@/lib/finance/products/api";

describe("finance unit: paths", () => {
  it("builds CRM finance paths", () => {
    expect(estimatesPath()).toBe("/v1/estimates");
    expect(quotesPath("/x")).toBe("/v1/quotes/x");
    expect(invoicesPath()).toBe("/v1/invoices");
    expect(creditNotesPath("/a/b")).toBe("/v1/credit-notes/a/b");
    expect(paymentsPath()).toBe("/v1/payments");
    expect(productsPath()).toBe("/v1/products");
    expect(publicSalesPath("quotes", "id", "hash", "/accept")).toBe(
      "/v1/public/sales/quotes/id/hash/accept",
    );
  });
});

describe("finance unit: status mappers", () => {
  it("maps estimate / quote / invoice / credit-note / payment / product statuses", () => {
    expect(mapEstimateStatus("SENT")).toBe("Sent");
    expect(mapEstimateStatus("accepted")).toBe("Accepted");
    expect(mapQuoteStatus("DRAFT")).toBe("Draft");
    expect(mapInvoiceStatus("PARTIALLY_PAID")).toBe("Partially Paid");
    expect(mapCreditNoteStatus("APPLIED")).toBe("Applied");
    expect(mapCreditNoteStatus("void")).toBe("Void");
    expect(mapPaymentStatus("COMPLETED")).toBe("Completed");
    expect(mapPaymentMethod("bank_transfer")).toBe("Bank transfer");
    expect(mapProductType("SERVICE")).toBe("Service");
    expect(mapProductStatus("INACTIVE")).toBe("Inactive");
  });
});

describe("finance unit: normalize", () => {
  it("normalizes estimate swagger-shaped payload", () => {
    const row = normalizeEstimate(
      {
        id: "e1",
        title: "Packaging",
        status: "SENT",
        clientName: "Greystone",
        total: 1100,
        lineItems: [{ name: "Fee", quantity: 1, unitPrice: 1000, taxRate: 10 }],
      },
      0,
    );
    expect(row.title).toBe("Packaging");
    expect(row.status).toBe("Sent");
    expect(row.clientName).toBe("Greystone");
    expect(row.lineItems).toHaveLength(1);
  });

  it("reads the title, client, and catalogue line the API stores on the document", () => {
    const row = normalizeEstimate(
      {
        id: "e2",
        status: "DRAFT",
        notes: "Kitchen reno\n\nCall before the site visit",
        company: { id: "c1", name: "Greystone" },
        contact: { id: "p1", firstName: "Ada", lastName: "Lovelace" },
        lineItems: [
          {
            description: "Labour",
            quantity: "1.00",
            unitPrice: "2200.00",
            product: { id: "prod-1", name: "Install" },
          },
        ],
        total: "2200.00",
      },
      0,
    );
    expect(row.title).toBe("Kitchen reno");
    expect(row.notes).toBe("Call before the site visit");
    expect(row.clientName).toBe("Greystone");
    expect(row.contactName).toBe("Ada Lovelace");
    expect(row.lineItems[0]?.name).toBe("Install");
    expect(row.lineItems[0]?.productId).toBe("prod-1");
  });

  it("keeps product kind in the description the catalogue API stores", () => {
    const body = toCreateProductBody({
      name: "Install",
      type: "Product",
      description: "On-site",
      unitPrice: 100,
    });
    expect(body.description).toBe("[kind:Product] On-site");
    expect(
      normalizeProduct(
        { id: "pr2", name: "Install", description: body.description, unitPrice: 100 },
        0,
      ).type,
    ).toBe("Product");
  });

  it("merges partial product patches without losing type or description", () => {
    expect(
      toUpdateProductBody(
        { type: "Product" },
        { type: "Service", description: "On-site" },
      ).description,
    ).toBe("[kind:Product] On-site");
    expect(
      toUpdateProductBody(
        { description: "Updated copy" },
        { type: "Product", description: "On-site" },
      ).description,
    ).toBe("[kind:Product] Updated copy");
  });

  it("reads plain-string owner fields from CRM payloads", () => {
    expect(financeOwnerName({ createdBy: "Ada" })).toBe("Ada");
    expect(
      normalizeEstimate({ id: "e3", status: "DRAFT", createdBy: "Ada" }, 0).owner,
    ).toBe("Ada");
  });

  it("normalizes quote / invoice / credit note / payment / product", () => {
    expect(
      normalizeQuote({ id: "q1", title: "Q", status: "SENT", clientName: "A" }, 0)
        .status,
    ).toBe("Sent");
    expect(
      normalizeInvoice(
        { id: "i1", title: "I", status: "PAID", clientName: "A", total: 50 },
        0,
      ).status,
    ).toBe("Paid");
    expect(
      normalizeCreditNote(
        { id: "c1", title: "C", status: "SENT", clientName: "A", total: 20 },
        0,
      ).status,
    ).toBe("Sent");
    expect(
      normalizePayment(
        {
          id: "p1",
          amount: 100,
          status: "COMPLETED",
          paymentMethod: "CARD",
          invoiceId: "i1",
        },
        0,
      ).status,
    ).toBe("Completed");
    expect(
      normalizeProduct(
        { id: "pr1", name: "Packaging", type: "SERVICE", unitPrice: 200 },
        0,
      ).type,
    ).toBe("Service");
  });

  it("builds estimate create body enums", () => {
    const body = toCreateEstimateBody({
      title: "Test",
      clientName: "Client",
      status: "Draft",
      owner: "Ada",
      validUntil: "20/10/2026",
      lineItems: [{ id: "l1", name: "Fee", quantity: 1, unitPrice: 100, taxRate: 10 }],
    });
    expect(body.currency).toBe("AUD");
    expect(body.expiryDate).toBe("2026-10-20");
    expect(body.estimateNumber).toMatch(/^EST-\d+$/);
    expect(body.notes).toBe("Test");
    expect(body.title).toBeUndefined();
    expect((body.lineItems as { description: string; quantity: string }[])[0]).toMatchObject({
      description: "Fee",
      quantity: "1.00",
    });
  });
});

describe("finance unit: public sales", () => {
  it("rewrites CRM public URLs onto in-app paths", () => {
    const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const hash = "abc";
    expect(
      rewritePublicSalesUrl(
        `https://finconnex.payperless.app/v1/public/sales/quotes/${id}/${hash}`,
      ),
    ).toBe(appPublicSalesPath("quotes", id, hash));
    expect(parsePublicSalesLink(`/public/sales/invoices/${id}/${hash}`)).toEqual({
      kind: "invoices",
      id,
      hash,
    });
  });

  it("normalizes public sales document totals", () => {
    const doc = normalizePublicSalesDocument("quotes", {
      id: "1",
      title: "Refinance",
      status: "SENT",
      clientName: "Greystone",
      lineItems: [{ name: "Fee", quantity: 1, unitPrice: 100, taxRate: 10 }],
    });
    expect(doc.total).toBe(110);
    expect(doc.title).toBe("Refinance");
  });
});

describe("finance unit: shared filters", () => {
  it("splits folded notes and matches the same window as the table", () => {
    expect(splitFinanceNotes("Title\n\nBody text").title).toBe("Title");
    expect(splitFinanceNotes("Title\n\nBody text").notes).toBe("Body text");
    expect(financeInWindow("all", "01/01/2020")).toBe(true);
    expect(financeInWindow("30d", "01/01/2020")).toBe(false);
    expect(financeInWindow("30d")).toBe(true);
    expect(
      financeMatchesQuery("volupta", ["Credit note", "Ut quis esse volupta"]),
    ).toBe(true);
  });

  it("filters short windows by document issue dates, not future due dates", () => {
    expect(financeInWindow("7d", "01/01/2020")).toBe(false);
    const future = new Date(Date.now() + 10 * 86_400_000);
    const dd = String(future.getDate()).padStart(2, "0");
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const yyyy = future.getFullYear();
    const issue = `${dd}/${mm}/${yyyy}`;
    expect(financeInWindow("7d", issue)).toBe(true);
  });
});

describe("finance unit: live probe helpers", () => {
  it("treats 200 and auth 401 as OK", () => {
    expect(isFinanceLiveOk(200, "ok")).toBe(true);
    expect(isFinanceLiveOk(401, "Invalid or missing access token")).toBe(true);
    expect(isFinanceLiveOk(404, "Quote not found")).toBe(true);
    expect(isFinanceLiveOk(404, "Cannot GET /v1/__missing__")).toBe(false);
    expect(financeLiveNote(200, "success")).toMatch(/^ok 200/);
  });
});
