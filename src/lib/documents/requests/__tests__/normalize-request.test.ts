import { describe, expect, it } from "vitest";
import { normalizeDocumentRequests } from "@/lib/documents/requests/api";

const REQUEST_ID = "bf046a80-3952-4937-ab2a-4ad5430685f6";

describe("document request normalize", () => {
  it("keeps the request id when the payload also lists requested files", () => {
    const [request] = normalizeDocumentRequests({
      statusCode: 201,
      data: {
        id: REQUEST_ID,
        title: "Payslips",
        status: "REQUESTED",
        documentType: "FINANCIAL",
        requestedFromId: "7ec422af-a851-4ae3-970b-86fd315521ff",
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Payslip",
            documentType: "FINANCIAL",
            status: "REQUESTED",
          },
        ],
      },
    });
    expect(request?.id).toBe(REQUEST_ID);
    expect(request?.id).not.toBe("crm-dr-0");
  });

  it("still reads a paged list of requests", () => {
    const rows = normalizeDocumentRequests({
      data: {
        items: [
          { id: REQUEST_ID, title: "Payslips", status: "REQUESTED" },
          {
            id: "22222222-2222-4222-8222-222222222222",
            title: "ID",
            status: "PENDING",
          },
        ],
        metadata: { totalItems: 2 },
      },
    });
    expect(rows.map((row) => row.id)).toEqual([
      REQUEST_ID,
      "22222222-2222-4222-8222-222222222222",
    ]);
  });
});
