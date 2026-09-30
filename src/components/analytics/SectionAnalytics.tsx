"use client";

import { useState } from "react";
import {
  BadgePercent,
  FileStack,
  Funnel,
  Handshake,
  Megaphone,
  Phone,
  Shield,
  Sparkles,
  Trophy,
  TrendingUp,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnalyticsPageLayout } from "@/components/analytics/AnalyticsPageLayout";
import { useLiveSectionPage } from "@/lib/analytics/use-live-section";
import type { SectionPageFilters } from "@/lib/analytics/section-page";
import type { AnalyticsSectionId } from "@/lib/analytics/library";

const KPI_ICONS: Record<AnalyticsSectionId, LucideIcon[]> = {
  business: [UserPlus, Funnel, Wallet, Shield, BadgePercent, TrendingUp],
  leads: [UserPlus, Funnel, BadgePercent, TrendingUp, Shield, Megaphone],
  deals: [Handshake, Wallet, Trophy, Shield, BadgePercent, TrendingUp],
  marketing: [Megaphone, Zap, UserPlus, Funnel, Wallet, BadgePercent],
  activity: [Zap, Phone, Funnel, Shield, BadgePercent, TrendingUp],
  team: [Users, UserPlus, Zap, Trophy, Wallet, TrendingUp],
  revenue: [Wallet, Handshake, BadgePercent, TrendingUp, Funnel, Shield],
  operations: [FileStack, Funnel, Shield, Trophy, TrendingUp, BadgePercent],
  customers: [UserRound, Funnel, Users, Trophy, BadgePercent, Wallet],
  forecast: [Sparkles, TrendingUp, Shield, Handshake, Zap, Wallet],
};

export function SectionAnalytics({ sectionId }: { sectionId: AnalyticsSectionId }) {
  const [filters, setFilters] = useState<SectionPageFilters>({
    dateRange: "this-year",
    owner: "All",
  });
  const { data } = useLiveSectionPage(sectionId, filters);

  return (
    <AnalyticsPageLayout
      kpiIcons={KPI_ICONS[sectionId]}
      filters={filters}
      onFilters={(next) =>
        setFilters((current) => ({
          ...current,
          ...next,
          dateRange: (next.dateRange as SectionPageFilters["dateRange"]) ?? current.dateRange,
          owner: current.owner,
        }))
      }
      data={data}
    />
  );
}
