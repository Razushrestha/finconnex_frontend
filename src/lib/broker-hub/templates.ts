import { createEmptyLink } from "@/lib/broker-hub/types";
import type { BrokerHubConfig, LinkIconType } from "@/lib/broker-hub/types";

export type BrokerHubTemplateId =
  | "blank"
  | "executive-portrait"
  | "webinar-landing"
  | "client-documents"
  | "social-grid";

type BrokerHubTemplatePreset = Pick<BrokerHubConfig, "profile" | "links"> & {
  label: string;
};

interface PresetLinkInput {
  title: string;
  url: string;
  icon: LinkIconType;
  highlight?: boolean;
}

function buildLinks(entries: PresetLinkInput[]): BrokerHubConfig["links"] {
  return entries.map((entry, index) => ({
    ...createEmptyLink(index, entry.icon),
    title: entry.title,
    url: entry.url,
    highlight: entry.highlight ?? false,
  }));
}

export const BROKER_HUB_TEMPLATES: Record<
  BrokerHubTemplateId,
  BrokerHubTemplatePreset
> = {
  blank: {
    label: "Blank hub",
    profile: {
      slug: "",
      avatarUrl: null,
      title: "",
      bio: "",
    },
    links: [],
  },
  "executive-portrait": {
    label: "Executive Portrait",
    profile: {
      slug: "",
      avatarUrl: null,
      title: "Eleanor Vance",
      bio: "Orchestrating digital transformation at scale. Focusing on intersectional growth strategies and human-centric product development.",
    },
    links: buildLinks([
      {
        title: "Buy a Home Loan",
        url: "",
        icon: "standard",
        highlight: true,
      },
      { title: "Refinance Your Mortgage", url: "", icon: "file" },
      { title: "Book a Free Consultation", url: "", icon: "standard" },
    ]),
  },
  "webinar-landing": {
    label: "Webinar Landing",
    profile: {
      slug: "",
      avatarUrl: null,
      title: "Upcoming Home Buying & Mortgage Webinar",
      bio: "Join us live to navigate current interest rates and loan options.",
    },
    links: buildLinks([
      {
        title: "Register for Live Session",
        url: "",
        icon: "standard",
        highlight: true,
      },
      { title: "Watch Past Market Updates", url: "", icon: "standard" },
    ]),
  },
  "client-documents": {
    label: "Client Documents",
    profile: {
      slug: "",
      avatarUrl: null,
      title: "Client Resource Portal",
      bio: "Your loan applications, rate sheets, and disclosures in one place.",
    },
    links: buildLinks([
      {
        title: "Current Mortgage Rates",
        url: "",
        icon: "file",
        highlight: true,
      },
      { title: "Loan Application Checklist", url: "", icon: "file" },
      { title: "Required Disclosures", url: "", icon: "file" },
    ]),
  },
  "social-grid": {
    label: "Social Grid",
    profile: {
      slug: "",
      avatarUrl: null,
      title: "Your Name",
      bio: "Follow along for daily mortgage tips and real estate market updates.",
    },
    links: buildLinks([
      {
        title: "Apply for Pre-Approval",
        url: "",
        icon: "standard",
        highlight: true,
      },
      { title: "Calculate Your Monthly Payment", url: "", icon: "standard" },
    ]),
  },
};

export function getBrokerHubTemplate(
  id: string | null | undefined,
): BrokerHubTemplatePreset | null {
  if (!id) return null;
  return BROKER_HUB_TEMPLATES[id as BrokerHubTemplateId] ?? null;
}

export function getHubConfigForTemplate(
  templateId: string | null | undefined,
): BrokerHubConfig {
  const template = getBrokerHubTemplate(templateId) ?? BROKER_HUB_TEMPLATES.blank;
  return {
    brokerId: "me",
    hubName: template.label,
    profile: { ...template.profile },
    links: template.links.map((link) => ({ ...link })),
    socials: [],
    customization: { theme: "default", fontStyle: "sans" },
    published: false,
  };
}
