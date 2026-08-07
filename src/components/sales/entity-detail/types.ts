import type { LucideIcon } from "lucide-react";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusBadgeData {
  label: string;
  tone: BadgeTone;
}

export interface HeaderTag {
  label: string;
  icon?: LucideIcon;
}

export interface HeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
}

export interface EntityDetailHeaderProps {
  breadcrumb: { label: string; href: string }[];
  avatarUrl?: string;
  /** Fallback initials shown when avatarUrl is absent. */
  initials: string;
  /** Small dot on the avatar, e.g. "online now". */
  isOnline?: boolean;
  name: string;
  /** e.g. "VP of Marketing · CloudScale Solutions" — pass pre-joined or use subtitleParts. */
  subtitleParts: string[];
  status: StatusBadgeData;
  tags?: HeaderTag[];
  /** The single emphasized action, e.g. "Convert to Deal". */
  primaryAction?: HeaderAction;
  /** Icon-only actions next to the primary action, e.g. mail / call. */
  quickActions?: HeaderAction[];
  onEditDetails?: () => void;
  onMoreActions?: () => void;
}

export interface ScoreBand {
  label: string;
  /** Tailwind color token used for the band's dot/text, e.g. "sky", "amber", "rose". */
  color: string;
}

export interface ScoreGaugeCardProps {
  title: string;
  score: number;
  maxScore?: number;
  /** e.g. "+5" shown as a small trend chip. Omit to hide. */
  trendLabel?: string;
  trendDirection?: "up" | "down";
  /** Ordered low → high, e.g. Cold / Warm / Hot. */
  bands: ScoreBand[];
  /** Index into bands[] the current score falls into, for highlighting the active label. */
  activeBandIndex: number;
}

export interface ContactField {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  helperText?: string;
}

export interface ContactInfoCardProps {
  title?: string;
  fields: ContactField[];
}

export interface ActivityComposerProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  submitLabel?: string;
}

export interface ActivityTabDef {
  key: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface ActivityTabsProps {
  tabs: ActivityTabDef[];
  activeKey: string;
  onChange: (key: string) => void;
}

export interface TimelineAttachment {
  label: string;
}

export interface TimelineItemData {
  id: string;
  type: "note" | "email" | "call" | "activity";
  icon: LucideIcon;
  iconTone?: BadgeTone;
  title: string;
  timestampLabel: string;
  body?: string;
  quote?: string;
  metaLine?: string;
  attachment?: TimelineAttachment;
  /** e.g. "Opened 10m ago" shown as a small green chip. */
  statusChip?: string;
}

export interface TimelineFeedProps {
  items: TimelineItemData[];
  onLoadMore?: () => void;
  loadMoreLabel?: string;
}

export interface NextStepCardProps {
  eyebrow?: string; // e.g. "Next Step"
  title: string;
  dueLabel: string; // e.g. "Due Tomorrow"
  dueTime?: string; // e.g. "10:00 AM"
  onComplete: () => void;
  onEdit?: () => void;
}

export interface OrgInfoCardProps {
  name: string;
  domain?: string;
  domainHref?: string;
  logoUrl?: string;
  mapImageUrl?: string;
  mapHref?: string;
  fields: { label: string; value: string }[];
}

export interface RelatedContact {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
}

export interface RelatedContactsCardProps {
  title?: string;
  contacts: RelatedContact[];
  totalCount: number;
  onViewAll?: () => void;
}
