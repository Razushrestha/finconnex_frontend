import { describe, expect, it } from "vitest";

import { applyClientProvideBundles } from "@/lib/documents/requests/provide-overlay";
import type { DocumentRequest } from "@/lib/documents/requests/types";

function request(partial: Partial<DocumentRequest> = {}): DocumentRequest {
  return {
    id: "req-1",
    requestId: "DR-081",
    title: "Property purchase - Ram",
    requestedFrom: "Ram Ram",
    documentType: "Property purchase",
    status: "Pending",
    dueDate: "15/10/2026",
    requestedBy: "nepatronix web",
    requestedDate: "06 Oct, 2026",
    lastUpdated: "06 Oct, 2026",
    progress: 0,
    items: [
      { id: "doc-1", title: "Driver licence", status: "Awaiting" },
      { id: "doc-2", title: "Passport", status: "Awaiting" },
    ],
    ...partial,
  };
}

const uploadedAt = "2026-10-07T07:00:00.000Z";

describe("applyClientProvideBundles", () => {
  it("marks matching documents uploaded and moves the request to review", () => {
    const [next] = applyClientProvideBundles(
      [request()],
      [
        {
          requestId: "req-1",
          requestedCount: 2,
          files: [
            {
              itemId: "other-id",
              title: "Driver licence",
              fileName: "licence.pdf",
              contentType: "application/pdf",
              uploadedAt,
            },
            {
              itemId: "doc-2",
              title: "Passport scan",
              fileName: "passport.jpg",
              contentType: "image/jpeg",
              uploadedAt,
            },
          ],
        },
      ],
    );
    expect(next.status).toBe("Received");
    expect(next.progress).toBe(100);
    expect(next.items?.[0]).toMatchObject({
      status: "Uploaded",
      fileName: "licence.pdf",
      source: "portal",
    });
    expect(next.items?.[1]).toMatchObject({
      status: "Uploaded",
      fileName: "passport.jpg",
      fileKind: "image",
    });
  });

  it("keeps an accepted document accepted", () => {
    const [next] = applyClientProvideBundles(
      [
        request({
          status: "Received",
          items: [
            {
              id: "doc-1",
              title: "Driver licence",
              status: "Accepted",
              fileName: "licence.pdf",
            },
            { id: "doc-2", title: "Passport", status: "Awaiting" },
          ],
        }),
      ],
      [
        {
          requestId: "req-1",
          requestedCount: 2,
          files: [
            {
              itemId: "doc-1",
              title: "Driver licence",
              fileName: "licence.pdf",
              contentType: "application/pdf",
              uploadedAt,
            },
          ],
        },
      ],
    );
    expect(next.items?.[0]?.status).toBe("Accepted");
    expect(next.items?.[1]?.status).toBe("Awaiting");
    expect(next.progress).toBe(50);
  });
});
