import {
  makeSigner,
  newSignerId,
  newSignerToken,
  type DeliveryMethod,
  type SignatureSigner,
  type SignerRole,
} from "@/lib/documents/signature/types";

export type ImportedRecipient = {
  email: string;
  name: string;
  role: SignerRole;
  phone?: string;
  deliveryMethod: DeliveryMethod;
};

const EMAIL_HEADERS = ["email", "email address", "e-mail", "mail", "recipient email"];
const NAME_HEADERS = ["name", "full name", "recipient", "recipient name", "client", "client name"];
const ROLE_HEADERS = ["role"];
const PHONE_HEADERS = ["phone", "mobile", "mobile number", "cell", "sms"];
const DELIVERY_HEADERS = ["deliver via", "delivery", "delivery method", "notify"];

function norm(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function columnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(norm(header)));
}

function mapRole(value: string): SignerRole {
  const text = norm(value);
  if (text.includes("copy") || text === "cc") return "CC";
  if (text.includes("approv")) return "Approver";
  return "Signer";
}

function mapDelivery(value: string): DeliveryMethod {
  const text = norm(value);
  if (text.includes("sms")) return "email_sms";
  return "email";
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

/** First row is headers when it names Email or Name and is not itself an address. */
export function recipientsFromRows(grid: string[][]): ImportedRecipient[] {
  const rows = grid
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return [];

  const headerish =
    rows[0].some((cell) => {
      const key = norm(cell);
      return (
        EMAIL_HEADERS.includes(key) ||
        NAME_HEADERS.includes(key) ||
        ROLE_HEADERS.includes(key)
      );
    }) && !rows[0].some((cell) => cell.includes("@"));

  const headers = headerish ? rows[0].map(norm) : [];
  const body = headerish ? rows.slice(1) : rows;
  const emailAt = headerish ? columnIndex(headers, EMAIL_HEADERS) : 0;
  const nameAt = headerish ? columnIndex(headers, NAME_HEADERS) : 1;
  const roleAt = headerish ? columnIndex(headers, ROLE_HEADERS) : -1;
  const phoneAt = headerish ? columnIndex(headers, PHONE_HEADERS) : -1;
  const deliveryAt = headerish ? columnIndex(headers, DELIVERY_HEADERS) : -1;

  const imported: ImportedRecipient[] = [];
  for (const row of body) {
    const email = (row[emailAt] ?? row.find((cell) => cell.includes("@")) ?? "").trim();
    if (!email.includes("@")) continue;
    const name = (nameAt >= 0 ? row[nameAt] : "")?.trim() || email.split("@")[0];
    const phone = phoneAt >= 0 ? row[phoneAt]?.trim() : "";
    const stated = mapDelivery(deliveryAt >= 0 ? row[deliveryAt] ?? "" : "");
    imported.push({
      email,
      name,
      role: mapRole(roleAt >= 0 ? row[roleAt] ?? "" : ""),
      phone: phone || undefined,
      deliveryMethod: phone || stated === "email_sms" ? "email_sms" : "email",
    });
  }
  return imported;
}

function spreadsheetRows(xml: string): string[][] {
  const rows: string[][] = [];
  const rowRe = /<Row\b[^>]*>([\s\S]*?)<\/Row>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(xml))) {
    const cells: string[] = [];
    const cellRe = /<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi;
    let cellMatch: RegExpExecArray | null;
    let column = 0;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const index = /ss:Index="(\d+)"/i.exec(cellMatch[1]);
      if (index) {
        const at = Number(index[1]) - 1;
        while (column < at) {
          cells.push("");
          column += 1;
        }
      }
      const data = /<Data\b[^>]*>([\s\S]*?)<\/Data>/i.exec(cellMatch[2]);
      cells.push(decodeXml(data?.[1] ?? cellMatch[2]));
      column += 1;
    }
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function taggedText(block: string, names: string[]) {
  for (const name of names) {
    const match = new RegExp(
      `<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,
      "i",
    ).exec(block);
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function attribute(block: string, names: string[]) {
  for (const name of names) {
    const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(block);
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function recordRows(xml: string): string[][] {
  const rows: string[][] = [];
  const blockRe =
    /<(recipient|client|contact|signer|person|customer)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml))) {
    const attrs = match[2] ?? "";
    const inner = match[3] ?? "";
    const email =
      taggedText(inner, ["email", "emailaddress", "mail"]) ||
      attribute(attrs, ["email", "emailaddress", "mail"]);
    const name =
      taggedText(inner, ["name", "fullname", "recipientname"]) ||
      attribute(attrs, ["name", "fullname"]);
    const role = taggedText(inner, ["role"]) || attribute(attrs, ["role"]);
    const phone =
      taggedText(inner, ["phone", "mobile", "mobilenumber"]) ||
      attribute(attrs, ["phone", "mobile"]);
    const delivery =
      taggedText(inner, ["delivery", "delivervia", "deliverymethod"]) ||
      attribute(attrs, ["delivery", "delivervia"]);
    if (email.includes("@")) rows.push([email, name, role, phone, delivery]);
  }
  if (!rows.length) return [];
  return [["email", "name", "role", "mobile", "delivery"], ...rows];
}

export function recipientsFromXml(xml: string): ImportedRecipient[] {
  const sheet = spreadsheetRows(xml);
  if (sheet.length) return recipientsFromRows(sheet);
  return recipientsFromRows(recordRows(xml));
}

function recipientsFromCsv(text: string): ImportedRecipient[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return recipientsFromRows(rows);
}

async function recipientsFromExcel(file: File): Promise<ImportedRecipient[]> {
  const XLSX = await import("xlsx");
  const book = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0] ?? ""];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return recipientsFromRows(
    grid.map((line) => (line ?? []).map((cell) => String(cell ?? "").trim())),
  );
}

export async function parseRecipientFile(file: File): Promise<ImportedRecipient[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xml")) return recipientsFromXml(await file.text());
  if (name.endsWith(".csv")) return recipientsFromCsv(await file.text());
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return recipientsFromExcel(file);
  throw new Error("Upload an Excel (.xlsx, .xls) or XML file.");
}

export function mergeBulkRecipients(
  current: SignatureSigner[],
  imported: ImportedRecipient[],
): { recipients: SignatureSigner[]; added: number } {
  const next = current.map((row) => ({ ...row }));
  const used = new Set(
    next.map((row) => row.email.trim().toLowerCase()).filter(Boolean),
  );
  let added = 0;
  for (const row of imported) {
    const email = row.email.trim();
    const key = email.toLowerCase();
    if (!email.includes("@") || used.has(key)) continue;
    used.add(key);
    added += 1;
    const empty = next.find((item) => !item.email.trim() && !item.name.trim());
    const order = empty ? empty.order : next.length + 1;
    const signer = makeSigner({
      id: empty?.id ?? newSignerId(),
      name: row.name.trim() || email.split("@")[0],
      email,
      phone: row.phone,
      order,
      token: empty?.token || newSignerToken(row.name || email),
      colorIndex: empty?.colorIndex ?? (order - 1),
      role: row.role,
      entityType: "email",
    });
    signer.deliveryMethod = row.deliveryMethod;
    signer.phone = row.phone;
    if (empty) {
      const index = next.indexOf(empty);
      next[index] = signer;
    } else {
      next.push(signer);
    }
  }
  return {
    recipients: next.map((row, index) => ({ ...row, order: index + 1 })),
    added,
  };
}
