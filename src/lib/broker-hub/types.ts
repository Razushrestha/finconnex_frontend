export type LinkIconType = "standard" | "file" | "video" | "social";

export type SocialPlatform =
  | "twitter"
  | "linkedin"
  | "github"
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "threads"
  | "whatsapp"
  | "telegram"
  | "pinterest"
  | "website";

export interface BrokerHubLink {
  id: string;
  title: string;
  url: string;
  icon: LinkIconType;
  active: boolean;
  highlight: boolean;
  animation: "none" | "pulse";
  subtitle?: string;
  order: number;
}

export interface BrokerHubSocial {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface BrokerHubProfile {
  slug: string;
  avatarUrl: string | null;
  title: string;
  bio: string;
}

export interface BrokerHubConfig {
  id?: string;
  brokerId: string;
  hubName: string;
  profile: {
    slug: string;
    avatarUrl: string | null;
    title: string;
    bio: string;
  };
  links: BrokerHubLink[];
  socials: BrokerHubSocial[];
  customization?: {
    theme: string;
    fontStyle: string;
    headerStyle?: string;
    footerStyle?: string;
  };
  published: boolean;
  templateId?: string;
}

export const createEmptyLink = (
  order: number,
  icon: LinkIconType = "standard",
): BrokerHubLink => ({
  id: `link_${crypto.randomUUID()}`,
  title: "",
  url: "",
  icon,
  active: true,
  highlight: false,
  animation: "none",
  order,
});

export function slugifyHub(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function prepareHubForSave(config: BrokerHubConfig): BrokerHubConfig {
  const title =
    config.profile.title.trim() || config.hubName.trim() || "Broker Hub";
  const hubName = config.hubName.trim() || title;
  const slug =
    slugifyHub(config.profile.slug) || slugifyHub(title) || "broker-hub";
  return {
    ...config,
    brokerId: config.brokerId || "me",
    hubName,
    published: Boolean(config.published),
    profile: {
      ...config.profile,
      title,
      slug,
      bio: config.profile.bio ?? "",
      avatarUrl: config.profile.avatarUrl || null,
    },
    links: Array.isArray(config.links) ? config.links : [],
    socials: Array.isArray(config.socials) ? config.socials : [],
    customization: config.customization ?? {
      theme: "default",
      fontStyle: "sans",
    },
  };
}

function asHubLinks(raw: unknown): BrokerHubLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const iconRaw = String(row.icon || "standard");
    const icon: LinkIconType =
      iconRaw === "file" || iconRaw === "video" || iconRaw === "social"
        ? iconRaw
        : "standard";
    return {
      id: String(row.id || `link_${index}`),
      title: String(row.title || ""),
      url: String(row.url || ""),
      icon,
      active: row.active !== false,
      highlight: Boolean(row.highlight),
      animation: row.animation === "pulse" ? "pulse" : "none",
      subtitle: typeof row.subtitle === "string" ? row.subtitle : undefined,
      order: typeof row.order === "number" ? row.order : index,
    };
  });
}

export function normalizeHubDraft(raw: unknown): BrokerHubConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  const profileRaw =
    parsed.profile && typeof parsed.profile === "object"
      ? (parsed.profile as Record<string, unknown>)
      : {};
  const title = String(
    profileRaw.title || parsed.currentTitle || parsed.hubName || "",
  ).trim();
  const socials = Array.isArray(parsed.socials)
    ? (parsed.socials as BrokerHubConfig["socials"])
    : [];
  return prepareHubForSave({
    id: typeof parsed.id === "string" ? parsed.id : undefined,
    brokerId: String(parsed.brokerId || "me"),
    hubName: String(parsed.hubName || title || "Broker Hub"),
    profile: {
      slug: String(profileRaw.slug || ""),
      avatarUrl:
        typeof profileRaw.avatarUrl === "string" ? profileRaw.avatarUrl : null,
      title,
      bio: String(profileRaw.bio || ""),
    },
    links: asHubLinks(parsed.links),
    socials,
    customization:
      parsed.customization && typeof parsed.customization === "object"
        ? (parsed.customization as BrokerHubConfig["customization"])
        : { theme: "default", fontStyle: "sans" },
    published: Boolean(parsed.published),
    templateId:
      typeof parsed.templateId === "string" ? parsed.templateId : undefined,
  });
}

const STORAGE_KEY_PREFIX = "finconnex_broker_hub_";

/**
 * Retrieves the hub configuration from localStorage.
 * If none exists, creates a default initial configuration.
 */
export async function getPublishedHubBySlug(
  slug: string,
): Promise<BrokerHubConfig | null> {
  // Return default template during server-side rendering
  if (typeof window === "undefined") return null;

  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${slug}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      const parsed = JSON.parse(storedData) as BrokerHubConfig;
      if (parsed?.profile?.slug === slug) return parsed;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch hub from localStorage", error);
    return null;
  }
}

/**
 * Helper function to save updates made in the builder straight to localStorage.
 * Call this function inside your onSave handler or state-sync lifecycle.
 */
export function saveHubConfigToLocalStorage(config: BrokerHubConfig): void {
  if (typeof window === "undefined") return;
  const slug = config.profile.slug?.trim();
  if (!slug) return;
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${slug}`;
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save hub to localStorage", error);
  }
}
