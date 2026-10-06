import { describe, expect, it } from "vitest";

import { normalizeLibraryDocument } from "@/lib/documents/library/api";
import {
  normalizeDocumentRequest,
  toCreateDocumentRequestBody,
  toUpdateDocumentRequestBody,
} from "@/lib/documents/requests/api";
import { normalizeSignatureRequestRemote } from "@/lib/documents/signature/api";

describe("document display names", () => {
  it("fills a request from the people and related records", () => {
    const row = normalizeDocumentRequest(
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Payslips",
        status: "PENDING",
        requestedFrom: {
          id: "22222222-2222-4222-8222-222222222222",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
        },
        requestedFromId: "22222222-2222-4222-8222-222222222222",
        requestedBy: {
          id: "33333333-3333-4333-8333-333333333333",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
        requestedById: "33333333-3333-4333-8333-333333333333",
        deal: { id: "44444444-4444-4444-8444-444444444444", name: "Home loan" },
        dealId: "44444444-4444-4444-8444-444444444444",
        progress: { total: 2, received: 1, approved: 0 },
        reminderAt: "2026-10-20T09:30:00.000Z",
        reminderRepeat: "Every week",
        notifyBy: ["Email"],
        receivedAt: "2026-10-06T00:00:00.000Z",
        items: [
          {
            id: "item-1",
            name: "Payslip",
            status: "RECEIVED",
            document: { id: "doc-1", name: "payslip.pdf" },
          },
          {
            id: "item-2",
            name: "ID",
            status: "AWAITING",
          },
        ],
      },
      0,
    );

    expect(row.requestedFrom).toBe("Ada Lovelace");
    expect(row.requestedBy).toBe("Grace Hopper");
    expect(row.relatedTo).toBe("Deal: Home loan");
    expect(row.clientEmail).toBe("ada@example.com");
    expect(row.progress).toBe(50);
    expect(row.repeat).toBe("Every week");
    expect(row.notifyBy).toEqual(["Email"]);
    expect(row.receivedDate).toBeTruthy();
    expect(row.items?.[0]?.fileName).toBe("payslip.pdf");
  });

  it("sends requested files and the reminder with the create body", () => {
    const body = toCreateDocumentRequestBody({
      title: "Payslips",
      documentType: "Financial",
      requestedFromId: "22222222-2222-4222-8222-222222222222",
      dueDate: "2026-10-20T17:00",
      reminderDate: "2026-10-18T09:00",
      repeat: "Every week",
      notifyBy: ["Email", "SMS"],
      items: [
        {
          id: "line-1",
          title: "Payslip",
          status: "Awaiting",
        },
      ],
    });

    expect(body.items).toEqual([
      { name: "Payslip", documentType: "FINANCIAL" },
    ]);
    expect(body.reminderRepeat).toBe("Every week");
    expect(body.notifyBy).toEqual(["Email", "SMS"]);
    expect(body.reminderAt).toEqual(expect.any(String));
  });

  it("omits create-only fields from a document request update", () => {
    const body = toUpdateDocumentRequestBody({
      title: "Payslips",
      documentType: "Financial",
      requestedFromId: "22222222-2222-4222-8222-222222222222",
      dealId: "44444444-4444-4444-8444-444444444444",
      repeat: "Off",
      notes: "Chase the payslip",
      items: [
        { id: "line-1", title: "Payslip", status: "Uploaded" },
      ],
    });

    expect(body).toEqual({
      title: "Payslips",
      documentType: "FINANCIAL",
      notes: "Chase the payslip",
    });
  });

  it("fills a library file owner, folder, and related record", () => {
    const doc = normalizeLibraryDocument(
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "contract.pdf",
        folder: { id: "folder-1", name: "Signed" },
        uploadedBy: {
          id: "33333333-3333-4333-8333-333333333333",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
        deal: { id: "44444444-4444-4444-8444-444444444444", name: "Home loan" },
      },
      0,
    );

    expect(doc.owner).toBe("Grace Hopper");
    expect(doc.folder).toBe("Signed");
    expect(doc.relatedTo).toBe("Deal: Home loan");
  });

  it("keeps the uploader and lead ids when the list has no names", () => {
    const doc = normalizeLibraryDocument(
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: "Letter.pdf",
        uploadedById: "33333333-3333-4333-8333-333333333333",
        leadId: "22222222-2222-4222-8222-222222222222",
      },
      0,
    );

    expect(doc.owner).toBe("—");
    expect(doc.ownerId).toBe("33333333-3333-4333-8333-333333333333");
    expect(doc.leadId).toBe("22222222-2222-4222-8222-222222222222");
    expect(doc.relatedTo).toBeUndefined();
  });

  it("fills a signature owner, document name, and related record", () => {
    const request = normalizeSignatureRequestRemote(
      {
        id: "66666666-6666-4666-8666-666666666666",
        createdBy: {
          id: "33333333-3333-4333-8333-333333333333",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
        document: {
          id: "doc-1",
          name: "contract.pdf",
          contact: { id: "c1", firstName: "Ada", lastName: "Lovelace" },
        },
        recipients: [{ id: "r1", name: "Ada Lovelace", email: "ada@example.com" }],
      },
      0,
    );

    expect(request.documentName).toBe("contract.pdf");
    expect(request.createdBy).toBe("Grace Hopper");
    expect(request.relatedTo).toBe("Contact: Ada Lovelace");
    expect(request.signer).toBe("Ada Lovelace");
  });
});
