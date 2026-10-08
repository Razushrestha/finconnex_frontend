import type { CSSProperties } from "react";
export const BOOKING_PAGE_LAYOUTS = [
  "basic",
  "modern",
  "classic",
  "fresh",
  "compact",
] as const;

export type BookingPageLayout = (typeof BOOKING_PAGE_LAYOUTS)[number];

export type BookingPageBranding = {
  layout: BookingPageLayout;
  primaryColor: string;
  showBanner: boolean;
  showUserAsCards: boolean;
  buttonText: string;
  backgroundImageUrl: string | null;
  /** How strongly the background image shows, 0 (hidden) to 100 (full). */
  backgroundOpacity: number;
  header: {
    title: string;
    titleVisible: boolean;
    logoUrl: string | null;
    logoVisible: boolean;
  };
  footer: {
    contact: string;
    contactVisible: boolean;
    email: string;
    emailVisible: boolean;
    address: string;
    addressVisible: boolean;
    facebook: string;
    facebookVisible: boolean;
    instagram: string;
    instagramVisible: boolean;
    x: string;
    xVisible: boolean;
    linkedin: string;
    linkedinVisible: boolean;
  };
  workspace: { displayName: string };
  seo: { title: string; description: string };
  serviceOrder: string[];
};

export type BookingPageService = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  isPublic?: boolean;
  isActive?: boolean;
};

// One cached theme per consultation: a page's theme never applies to another.
const STORE = "booking:page-theme:v2";

export function defaultBookingPageBranding(): BookingPageBranding {
  return {
    layout: "basic",
    primaryColor: "#5A32A3",
    showBanner: true,
    showUserAsCards: false,
    buttonText: "Book Appointment",
    backgroundImageUrl: null,
    backgroundOpacity: 100,
    header: {
      title: "",
      titleVisible: true,
      logoUrl: null,
      logoVisible: true,
    },
    footer: {
      contact: "",
      contactVisible: false,
      email: "",
      emailVisible: false,
      address: "",
      addressVisible: false,
      facebook: "",
      facebookVisible: false,
      instagram: "",
      instagramVisible: false,
      x: "",
      xVisible: false,
      linkedin: "",
      linkedinVisible: false,
    },
    workspace: { displayName: "" },
    seo: { title: "", description: "" },
    serviceOrder: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeBookingPageBranding(
  raw: unknown,
): BookingPageBranding {
  const current = asRecord(raw);
  const header = asRecord(current.header);
  const footer = asRecord(current.footer);
  const workspace = asRecord(current.workspace);
  const seo = asRecord(current.seo);
  const next = defaultBookingPageBranding();
  if (BOOKING_PAGE_LAYOUTS.includes(current.layout as BookingPageLayout)) {
    next.layout = current.layout as BookingPageLayout;
  }
  if (
    typeof current.primaryColor === "string" &&
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(current.primaryColor)
  ) {
    next.primaryColor = current.primaryColor;
  }
  next.showBanner = current.showBanner !== false;
  next.showUserAsCards = current.showUserAsCards === true;
  if (typeof current.buttonText === "string") {
    next.buttonText = current.buttonText;
  }
  if (typeof current.backgroundImageUrl === "string") {
    next.backgroundImageUrl = current.backgroundImageUrl || null;
  }
  if (
    typeof current.backgroundOpacity === "number" &&
    Number.isFinite(current.backgroundOpacity)
  ) {
    next.backgroundOpacity = Math.min(
      100,
      Math.max(0, Math.round(current.backgroundOpacity)),
    );
  }
  next.header = {
    title: typeof header.title === "string" ? header.title : "",
    titleVisible: header.titleVisible !== false,
    logoUrl: typeof header.logoUrl === "string" ? header.logoUrl : null,
    logoVisible: header.logoVisible !== false,
  };
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const on = (value: unknown) => value === true;
  next.footer = {
    contact: text(footer.contact),
    contactVisible: on(footer.contactVisible),
    email: text(footer.email),
    emailVisible: on(footer.emailVisible),
    address: text(footer.address),
    addressVisible: on(footer.addressVisible),
    facebook: text(footer.facebook),
    facebookVisible: on(footer.facebookVisible),
    instagram: text(footer.instagram),
    instagramVisible: on(footer.instagramVisible),
    x: text(footer.x),
    xVisible: on(footer.xVisible),
    linkedin: text(footer.linkedin),
    linkedinVisible: on(footer.linkedinVisible),
  };
  next.workspace = {
    displayName:
      typeof workspace.displayName === "string" ? workspace.displayName : "",
  };
  next.seo = {
    title: typeof seo.title === "string" ? seo.title : "",
    description: typeof seo.description === "string" ? seo.description : "",
  };
  next.serviceOrder = Array.isArray(current.serviceOrder)
    ? current.serviceOrder.filter((id): id is string => typeof id === "string")
    : [];
  return next;
}

/** This consultation's cached theme; the Basic defaults when it has none. */
export function readLocalBookingPageBranding(
  pageId: string,
): BookingPageBranding {
  if (typeof window === "undefined") return defaultBookingPageBranding();
  try {
    return normalizeBookingPageBranding(
      JSON.parse(localStorage.getItem(`${STORE}:${pageId}`) || "null"),
    );
  } catch {
    return defaultBookingPageBranding();
  }
}

export function writeLocalBookingPageBranding(
  pageId: string,
  branding: BookingPageBranding,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORE}:${pageId}`, JSON.stringify(branding));
  } catch {
    /* storage full or blocked; the server copy still holds it */
  }
}

export const BOOKING_PAGE_COLORS = [
  "#A5A3E8",
  "#EF4444",
  "#3B82F6",
  "#22C55E",
  "#7C3AED",
  "#BE123C",
  "#1E3A8A",
  "#16A34A",
  "#F97316",
  "#EAB308",
  "#EC4899",
  "#111827",
  "#5A32A3",
  "#0EA5E9",
  "#14B8A6",
  "#F43F5E",
  "#84CC16",
  "#6366F1",
];

/**
 * The page background for a branding: its image, faded to the chosen
 * opacity. The fade is a white veil over the image (the page underneath is
 * white), so only the background fades and never the content on top of it.
 */
export function brandingBackgroundStyle(
  branding: Pick<
    BookingPageBranding,
    "backgroundImageUrl" | "backgroundOpacity"
  >,
): CSSProperties {
  if (!branding.backgroundImageUrl) return {};
  const opacity = Math.min(100, Math.max(0, branding.backgroundOpacity ?? 100));
  const veil = (100 - opacity) / 100;
  const image = `url(${branding.backgroundImageUrl})`;
  return {
    backgroundImage: veil
      ? `linear-gradient(rgba(255,255,255,${veil}), rgba(255,255,255,${veil})), ${image}`
      : image,
    backgroundSize: "cover",
    backgroundPosition: "center",
    // A linked library photo whose host cannot be reached leaves plain white.
    backgroundColor: "#ffffff",
  };
}
