import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  mergeBulkRecipients,
  parseRecipientFile,
  recipientsFromRows,
  recipientsFromXml,
} from "@/lib/documents/signature/bulk-recipients";
import { makeSigner } from "@/lib/documents/signature/types";

describe("bulk signature recipients", () => {
  it("reads an XML client list", () => {
    const rows = recipientsFromXml(`
      <clients>
        <client>
          <email>ada@example.com</email>
          <name>Ada Lovelace</name>
          <role>Receives a copy</role>
        </client>
        <client email="grace@example.com" name="Grace Hopper" />
      </clients>
    `);
    expect(rows).toEqual([
      {
        email: "ada@example.com",
        name: "Ada Lovelace",
        role: "CC",
        phone: undefined,
        deliveryMethod: "email",
      },
      {
        email: "grace@example.com",
        name: "Grace Hopper",
        role: "Signer",
        phone: undefined,
        deliveryMethod: "email",
      },
    ]);
  });

  it("reads a spreadsheet header row", () => {
    const rows = recipientsFromRows([
      ["Email Address", "Name", "Mobile", "Role"],
      ["ada@example.com", "Ada", "0412000000", "Needs to sign"],
      ["", "", "", ""],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "ada@example.com",
      name: "Ada",
      phone: "0412000000",
      role: "Signer",
      deliveryMethod: "email_sms",
    });
  });

  it("fills empty rows and skips people already listed", async () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Email", "Name"],
      ["ada@example.com", "Ada"],
      ["grace@example.com", "Grace"],
    ]);
    XLSX.utils.book_append_sheet(book, sheet, "Recipients");
    const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([buffer], "clients.xlsx");
    const imported = await parseRecipientFile(file);
    const current = [
      makeSigner({
        id: "existing",
        name: "Ada",
        email: "ada@example.com",
        order: 1,
        token: "tok-ada",
      }),
      makeSigner({
        id: "blank",
        name: "",
        email: "",
        order: 2,
        token: "tok-blank",
      }),
    ];
    const merged = mergeBulkRecipients(current, imported);
    expect(merged.added).toBe(1);
    expect(merged.recipients.map((row) => row.email)).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
    expect(merged.recipients[1]?.id).toBe("blank");
  });
});
