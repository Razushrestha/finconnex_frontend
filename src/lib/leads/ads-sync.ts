/**
 * Phase F1 — Meta / LinkedIn / TikTok lead sync (demo fixtures).
 */

import { createLead, listLeadEmails } from "@/lib/leads/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
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
  facebook: [
    {
      id: "fb-1",
      firstName: "Priya",
      lastName: "Nair",
      email: "priya.nair.fb@example.com",
      phone: "+61 400 111 201",
      company: "Nair Homes",
      campaign: "Meta · Rate Lock Q3",
    },
    {
      id: "fb-2",
      firstName: "Lucas",
      lastName: "Nguyen",
      email: "lucas.nguyen.fb@example.com",
      phone: "+61 400 111 202",
      company: "Nguyen Property",
      campaign: "Meta · First Home Buyer",
    },
  ],
  linkedin: [
    {
      id: "li-1",
      firstName: "Amelia",
      lastName: "Brooks",
      email: "amelia.brooks.li@example.com",
      phone: "+61 400 222 301",
      company: "Brooks Advisory",
      campaign: "LinkedIn · Broker Partner",
    },
  ],
  tiktok: [
    {
      id: "tt-1",
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan.lee.tt@example.com",
      phone: "+61 400 333 401",
      company: "Lee Living",
      campaign: "TikTok · Refinance Shorts",
    },
    {
      id: "tt-2",
      firstName: "Sofia",
      lastName: "Martinez",
      email: "sofia.martinez.tt@example.com",
      company: "Martinez Group",
      campaign: "TikTok · Refinance Shorts",
    },
  ],
  google: [
    {
      id: "ga-1",
      firstName: "Ethan",
      lastName: "Walsh",
      email: "ethan.walsh.ga@example.com",
      phone: "+61 400 444 501",
      company: "Walsh Finance",
      campaign: "Google Ads · Home Loan Search",
    },
    {
      id: "ga-2",
      firstName: "Mia",
      lastName: "Patel",
      email: "mia.patel.ga@example.com",
      company: "Patel Group",
      campaign: "Google Ads · Refinance",
    },
  ],
};

export const ADS_PLATFORM_LABEL: Record<AdsPlatform, string> = {
  facebook: "Facebook / Meta Ads",
  linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads",
  google: "Google Ads",
};

/** Map ad platforms onto existing LeadSource enum. */
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

export function syncAdsLeads(
  platform: AdsPlatform,
  opts?: { skipDuplicates?: boolean },
): {
  imported: LeadCardData[];
  skipped: number;
  platform: AdsPlatform;
} {
  const skipDuplicates = opts?.skipDuplicates ?? true;
  const existing = new Set(listLeadEmails());
  const imported: LeadCardData[] = [];
  let skipped = 0;

  for (const row of FIXTURES[platform]) {
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

  return { imported, skipped, platform };
}
