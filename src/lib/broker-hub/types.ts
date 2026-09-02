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
      return JSON.parse(storedData) as BrokerHubConfig;
    }

    // If looking up a slug that hasn't been explicitly saved yet,
    // search localStorage for ANY saved hub so you don't hit hardcoded defaults
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data) as BrokerHubConfig;
          // Return the most recent custom saved hub if found
          return parsed;
        }
      }
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
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${config.profile.slug}`;
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save hub to localStorage", error);
  }
}
