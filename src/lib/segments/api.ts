import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

export type CrmSegment = {
  id: string;
  name: string;
  description?: string;
  isStatic: boolean;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as { items?: unknown; segments?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.segments)) return extractRecords(rec.segments);
  }
  return [];
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function mapSegment(raw: Record<string, unknown>): CrmSegment {
  return {
    id: pickStr(raw.id),
    name: pickStr(raw.name, "Untitled segment"),
    description: pickStr(raw.description) || undefined,
    isStatic: Boolean(raw.isStatic),
  };
}

export async function listCrmSegments(): Promise<CrmSegment[]> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load segments");
  const data = await crmFetch(auth, "/v1/segments?limit=100");
  return extractRecords(data).map(mapSegment).filter((row) => row.id);
}

export async function createCrmSegment(input: {
  name: string;
  description?: string;
}): Promise<CrmSegment> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to create a segment");
  const data = await crmFetch(auth, "/v1/segments", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      filters: {},
      isStatic: false,
    }),
  });
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? mapSegment(data as Record<string, unknown>)
      : extractRecords(data).map(mapSegment)[0];
  if (!row?.id) throw new Error("Segment was not created");
  return row;
}

/** Resolve a segment by audience label, creating a dynamic catch-all if needed. */
export async function ensureCrmSegment(audienceLabel: string): Promise<CrmSegment> {
  const name = audienceLabel.trim() || "All contacts";
  const existing = await listCrmSegments();
  const match = existing.find(
    (row) => row.name.toLowerCase() === name.toLowerCase(),
  );
  if (match) return match;
  if (existing[0]) return existing[0];
  return createCrmSegment({
    name,
    description: "Auto-created for marketing campaigns",
  });
}
