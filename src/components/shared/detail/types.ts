import type { ReactNode } from "react";

export interface OverviewField {
  id: string;
  label: string;
  value: ReactNode;
  href?: string;
  icon?: ReactNode;
}

export interface RelatedListItem {
  id: string;
  label: string;
  count?: number;
}

export interface RelatedLinkItem {
  id: string;
  label: string;
  href: string;
}

export interface DetailHeaderAction {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export interface RelatedTableColumn {
  key: string;
  label: string;
}

export interface RelatedTableRow {
  id: string;
  cells: Record<string, ReactNode>;
}
