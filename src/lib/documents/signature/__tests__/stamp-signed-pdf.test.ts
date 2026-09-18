import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  fieldsForDocument,
  isPdfBytes,
  resolveFieldStampValue,
  signedAttachmentName,
  stampSignedPdfBytes,
} from "@/lib/documents/signature/stamp-signed-pdf";
import { prefillFieldsWithValues } from "@/lib/documents/signature/bake-prefill";
import { toCrmFieldGeometry, toCrmSignatureFieldType } from "@/lib/documents/signature/api";
import { PREFILL_RECIPIENT_ID } from "@/lib/documents/signature/types";
import type { SignatureField, SignatureRequest } from "@/lib/documents/signature/types";

async function blankPdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save();
}

describe("stamp signed pdf", () => {
  it("names the emailed copy as a signed PDF", () => {
    expect(signedAttachmentName("1.pdf")).toBe("1_signed.pdf");
    expect(signedAttachmentName("contract_signed.pdf")).toBe("contract_signed.pdf");
  });

  it("uses the signer drawing when the field value is empty", () => {
    const field = {
      id: "f1",
      kind: "signature",
      label: "Signature",
      x: 10,
      y: 80,
      w: 36,
      h: 8,
      page: 1,
      signerId: "s1",
      required: true,
    } as SignatureField;
    expect(
      resolveFieldStampValue(field, {
        id: "s1",
        name: "Ada",
        email: "ada@example.com",
        order: 1,
        role: "Signer",
        status: "Signed",
        token: "t",
        deliveryMethod: "email",
        colorIndex: 0,
        signatureData: "typed:Ada Lovelace",
      }),
    ).toBe("typed:Ada Lovelace");
  });

  it("burns typed signature text into the PDF", async () => {
    const source = await blankPdf();
    const stamped = await stampSignedPdfBytes(
      source,
      [
        {
          id: "f1",
          kind: "signature",
          label: "Signature",
          x: 12,
          y: 70,
          w: 36,
          h: 8,
          page: 1,
          signerId: "s1",
          required: true,
          value: "typed:Nepatronix",
        },
      ],
      [],
    );
    expect(isPdfBytes(stamped)).toBe(true);
    expect(stamped.byteLength).toBeGreaterThan(source.byteLength);
  });

  it("keeps unscoped fields on the first document only", () => {
    const req = {
      id: "req-1",
      fields: [
        {
          id: "f1",
          kind: "signature",
          label: "Signature",
          x: 10,
          y: 10,
          w: 20,
          h: 8,
          page: 1,
          signerId: "s1",
          required: true,
        },
        {
          id: "f2",
          kind: "text",
          label: "Note",
          x: 10,
          y: 20,
          w: 20,
          h: 8,
          page: 1,
          signerId: "s1",
          required: false,
        },
      ],
    } as SignatureRequest;
    expect(fieldsForDocument(req, "primary", 0)).toHaveLength(2);
    expect(fieldsForDocument(req, "extra", 1)).toHaveLength(0);
  });

  it("stamps a pixel-sized field using the same preview box as the overlay", async () => {
    const { placedFieldPdfRect } = await import(
      "@/lib/documents/signature/field-placement"
    );
    const box = placedFieldPdfRect(
      { x: 10, y: 20, w: 140, h: 36 },
      612,
      792,
    );
    expect(box.x).toBeCloseTo(61.2, 1);
    expect(box.width).toBeCloseTo(122.4, 1);
    expect(box.height).toBeCloseTo(31.46, 1);
  });

  it("selects only filled prefill fields to bake into the PDF", () => {
    const fields = [
      {
        id: "f1",
        kind: "company",
        label: "Company",
        x: 10,
        y: 10,
        w: 140,
        h: 36,
        page: 1,
        signerId: PREFILL_RECIPIENT_ID,
        required: false,
        value: "Nepatronix",
      },
      {
        id: "f2",
        kind: "signature",
        label: "Signature",
        x: 50,
        y: 10,
        w: 140,
        h: 36,
        page: 1,
        signerId: "sg-1",
        required: true,
      },
    ] as SignatureField[];
    expect(prefillFieldsWithValues(fields)).toHaveLength(1);
    expect(prefillFieldsWithValues(fields)[0].id).toBe("f1");
  });

  it("maps place-fields boxes to CRM 0-1 geometry", () => {
    expect(toCrmSignatureFieldType("company")).toBe("TEXT");
    expect(toCrmSignatureFieldType("signature")).toBe("SIGNATURE");
    const box = toCrmFieldGeometry({
      id: "f1",
      kind: "text",
      label: "Name",
      x: 10,
      y: 20,
      w: 140,
      h: 36,
      page: 1,
      signerId: "s1",
      required: true,
    });
    expect(box.x).toBeCloseTo(0.1, 5);
    expect(box.y).toBeCloseTo(0.2, 5);
    expect(box.width).toBeGreaterThan(0.001);
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.pageNumber).toBe(1);
  });
});
