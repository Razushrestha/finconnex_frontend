/**
 * Phase F1 — Meta / LinkedIn / TikTok lead sync.
 */

import { createLead, listLeadEmails } from "@/lib/leads/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { importCrmLeadsFromAds, refreshCrmLeadsBoard } from "@/lib/leads/api";
import { toCrmCreateBody } from "@/lib/leads/api/map";
import type { LeadCardData, LeadSource } from "@/lib/leads/types";

export type AdsPlatform = "facebook" | "linkedin" | "tiktok" | "google";

export type AdsLeadFixture = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  campaign: string;
};

const FIXTURES: Record<AdsPlatform, AdsLeadFixture[]> = {
  facebook: [],
  linkedin: [],
  tiktok: [],
  google: [],
};

export const ADS_PLATFORM_LABEL: Record<AdsPlatform, string> = {
  facebook: "Facebook / Meta Ads",
  linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads",
  google: "Google Ads",
};

export function adsPlatformToSource(platform: AdsPlatform): LeadSource {
  if (platform === "facebook") return "Facebook";
  if (platform === "tiktok") return "TikTok";
  if (platform === "google") return "Google Ads";
  return "Other";
}

export function previewAdsSync(platform: AdsPlatform): {
  fixtures: AdsLeadFixture[];
  newCount: number;
  duplicateEmails: string[];
} {
  const existing = new Set(listLeadEmails());
  const fixtures = FIXTURES[platform];
  const duplicateEmails = fixtures
    .filter((f) => existing.has(f.email.toLowerCase()))
    .map((f) => f.email);
  return {
    fixtures,
    newCount: fixtures.length - duplicateEmails.length,
    duplicateEmails,
  };
}

const ADS_CRM_PLATFORM: Record<
  AdsPlatform,
  "meta" | "google" | "linkedin" | "tiktok"
> = {
  facebook: "meta",
  google: "google",
  linkedin: "linkedin",
  tiktok: "tiktok",
};

export async function syncAdsLeads(
  platform: AdsPlatform,
  opts?: { skipDuplicates?: boolean },
): Promise<{
  imported: LeadCardData[];
  created: number;
  skipped: number;
  platform: AdsPlatform;
}> {
  const skipDuplicates = opts?.skipDuplicates ?? true;
  const fixtures = FIXTURES[platform];
  const rows = fixtures.map((row) =>
    toCrmCreateBody({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      company: row.company
        ? `${row.company} · ${row.campaign}`
        : row.campaign,
      source: adsPlatformToSource(platform),
    }),
  );

  try {
    const live = await importCrmLeadsFromAds({
      platform: ADS_CRM_PLATFORM[platform],
      rows,
      duplicateHandling: skipDuplicates ? "SKIP" : "UPDATE",
      campaignId: fixtures[0]?.campaign,
    });
    if (live) {
      await refreshCrmLeadsBoard();
      return {
        imported: [],
        created: live.created,
        skipped: live.skipped,
        platform,
      };
    }
  } catch {
    /* fall through to local fixtures */
  }

  const existing = new Set(listLeadEmails());
  const imported: LeadCardData[] = [];
  let skipped = 0;

  for (const row of fixtures) {
    if (skipDuplicates && existing.has(row.email.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const card = createLead({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      company: row.company
        ? `${row.company} · ${row.campaign}`
        : row.campaign,
      source: adsPlatformToSource(platform),
      status: "New",
      owner: ACTIVITY_OWNERS[0],
    });
    imported.push(card);
    existing.add(row.email.toLowerCase());
  }

  return { imported, created: imported.length, skipped, platform };
}
