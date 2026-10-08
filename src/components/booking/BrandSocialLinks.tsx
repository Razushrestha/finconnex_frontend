"use client";

import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

import type { BookingPageBranding } from "@/lib/booking/page-branding";
import { cn } from "@/lib/utils";

type SocialKind = "facebook" | "instagram" | "x" | "linkedin";

const SOCIAL_BASE: Record<SocialKind, string> = {
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  x: "https://x.com/",
  linkedin: "https://www.linkedin.com/in/",
};

const SOCIAL_LABEL: Record<SocialKind, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
};

/**
 * A link for what was typed in the footer settings: a full URL is kept, a
 * bare domain ("facebook.com/acme") gets https://, and a handle ("acme" or
 * "@acme") becomes that network's profile URL.
 */
export function socialUrl(kind: SocialKind, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+\//.test(value)) return `https://${value}`;
  const handle = value.replace(/^@/, "").replace(/^\/+/, "");
  // LinkedIn company pages are typed as "company/acme".
  if (kind === "linkedin" && handle.includes("/")) {
    return `https://www.linkedin.com/${handle}`;
  }
  return `${SOCIAL_BASE[kind]}${handle}`;
}

export function brandSocialLinks(branding: BookingPageBranding) {
  const footer = branding.footer;
  const rows: Array<{ kind: SocialKind; value: string; visible: boolean }> = [
    { kind: "facebook", value: footer.facebook, visible: footer.facebookVisible },
    { kind: "instagram", value: footer.instagram, visible: footer.instagramVisible },
    { kind: "x", value: footer.x, visible: footer.xVisible },
    { kind: "linkedin", value: footer.linkedin, visible: footer.linkedinVisible },
  ];
  return rows
    .filter((row) => row.visible && row.value.trim())
    .map((row) => ({
      kind: row.kind,
      label: SOCIAL_LABEL[row.kind],
      href: socialUrl(row.kind, row.value),
    }));
}

function SocialGlyph({ kind, className }: { kind: SocialKind; className?: string }) {
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  const paths: Record<Exclude<SocialKind, "instagram">, string> = {
    facebook:
      "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z",
    x: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2z",
    linkedin:
      "M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.3 8.4h3.4V20H3.3V8.4zm5.6 0h3.25v1.6h.05c.45-.85 1.56-1.75 3.2-1.75 3.43 0 4.06 2.25 4.06 5.18V20h-3.4v-5.8c0-1.38-.02-3.16-1.93-3.16-1.93 0-2.22 1.5-2.22 3.06V20H8.9V8.4z",
  };
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={paths[kind]} />
    </svg>
  );
}

/** The visible social profiles as icon links. */
export function BrandSocialIcons({
  branding,
  className,
  size = "md",
}: {
  branding: BookingPageBranding;
  className?: string;
  size?: "sm" | "md";
}) {
  const links = brandSocialLinks(branding);
  if (!links.length) return null;
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {links.map((link) => (
        <a
          key={link.kind}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={cn(
            "flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[var(--booking-brand,var(--brand-primary))] hover:text-[var(--booking-brand,var(--brand-primary))]",
            size === "sm" ? "h-7 w-7" : "h-8 w-8",
          )}
        >
          <SocialGlyph
            kind={link.kind}
            className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
          />
        </a>
      ))}
    </div>
  );
}

export function hasBrandFooter(
  branding: BookingPageBranding,
  { socials = true }: { socials?: boolean } = {},
) {
  const footer = branding.footer;
  return Boolean(
    (footer.contactVisible && footer.contact.trim()) ||
      (footer.emailVisible && footer.email.trim()) ||
      (footer.addressVisible && footer.address.trim()) ||
      (socials && brandSocialLinks(branding).length),
  );
}

/** "Follow us" with the social icons, under the Basic layout's step list. */
export function BrandSocialFollow({
  branding,
  className,
  size = "md",
}: {
  branding: BookingPageBranding;
  className?: string;
  size?: "sm" | "md";
}) {
  if (!brandSocialLinks(branding).length) return null;
  return (
    <div className={cn("border-t border-slate-100", className)}>
      <p
        className={cn(
          "mb-2 font-medium text-slate-500",
          size === "sm" ? "text-[11px]" : "text-[12px]",
        )}
      >
        Follow us
      </p>
      <BrandSocialIcons branding={branding} size={size} />
    </div>
  );
}

/** Contact details (call / email / map links) and, unless left out, social icons. */
export function BrandFooter({
  branding,
  className,
  size = "md",
  socials = true,
}: {
  branding: BookingPageBranding;
  className?: string;
  size?: "sm" | "md";
  /** False where the socials are shown elsewhere on the page. */
  socials?: boolean;
}) {
  if (!hasBrandFooter(branding, { socials })) return null;
  const footer = branding.footer;
  const contact = footer.contact.trim();
  const email = footer.email.trim();
  const address = footer.address.trim();
  const items: Array<{ key: string; icon: ReactNode; text: string; href: string }> = [];
  const iconClass = "h-3.5 w-3.5 shrink-0 text-slate-400";
  if (footer.contactVisible && contact) {
    items.push({
      key: "contact",
      icon: <Phone className={iconClass} />,
      text: contact,
      href: `tel:${contact.replace(/[^\d+]/g, "")}`,
    });
  }
  if (footer.emailVisible && email) {
    items.push({
      key: "email",
      icon: <Mail className={iconClass} />,
      text: email,
      href: `mailto:${email}`,
    });
  }
  if (footer.addressVisible && address) {
    items.push({
      key: "address",
      icon: <MapPin className={iconClass} />,
      text: address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-slate-500",
        size === "sm" ? "text-[11px]" : "text-[12px]",
        className,
      )}
    >
      {items.length ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              target={item.key === "address" ? "_blank" : undefined}
              rel={item.key === "address" ? "noopener noreferrer" : undefined}
              className="inline-flex min-w-0 items-center gap-1.5 hover:text-slate-800 hover:underline"
            >
              {item.icon}
              <span className="truncate">{item.text}</span>
            </a>
          ))}
        </div>
      ) : (
        <span />
      )}
      {socials ? <BrandSocialIcons branding={branding} size={size} /> : null}
    </div>
  );
}
