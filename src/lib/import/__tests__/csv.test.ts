import { describe, expect, it } from "vitest";
import { autoMapHeaders, parseCsv, toCsv } from "@/lib/import/csv";

describe("csv import helpers", () => {
  it("parses quoted commas", () => {
    const parsed = parseCsv(
      'First Name,Last Name,Email\n"Ava, Jr",Nguyen,ava@example.com\n',
    );
    expect(parsed.headers).toEqual(["First Name", "Last Name", "Email"]);
    expect(parsed.rows[0]).toEqual({
      "First Name": "Ava, Jr",
      "Last Name": "Nguyen",
      Email: "ava@example.com",
    });
  });

  it("auto-maps common aliases", () => {
    const mapping = autoMapHeaders(
      ["firstname", "Surname", "E-mail", "Company Name"],
      [
        { key: "firstName", aliases: ["first name", "firstname"] },
        { key: "lastName", aliases: ["last name", "surname"] },
        { key: "email", aliases: ["e-mail", "email"] },
        { key: "company", aliases: ["company name"] },
      ],
    );
    expect(mapping.firstName).toBe("firstname");
    expect(mapping.lastName).toBe("Surname");
    expect(mapping.email).toBe("E-mail");
    expect(mapping.company).toBe("Company Name");
  });

  it("round-trips toCsv", () => {
    const csv = toCsv(["A", "B"], [["1", 'say "hi"']]);
    expect(csv).toContain('"say ""hi"""');
  });
});
