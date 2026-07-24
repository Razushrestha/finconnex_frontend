import type { Metadata } from "next";
import { TeamManagementHeader } from "@/components/teams/TeamManagementHeader";
import { TeamStatCard } from "@/components/teams/TeamStatCard";
import {
  NewTeamMembersCard,
  TeamPerformancesCard,
} from "@/lib/lazy-charts";

export const metadata: Metadata = {
  title: "Team: FinConnex",
  description: "Team performance, members, and management.",
};

export default function TeamManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <TeamManagementHeader />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4 sm:gap-6">
          <TeamStatCard
            title="Total Team Members"
            value="12,354"
            delta="+12.1%"
            footerLabel="Vs last month:"
            footerValue="8,554"
          />
          <TeamStatCard
            title="Customer Satisfaction"
            value="94%"
            delta="+12.1%"
            footerLabel="Vs last month:"
            footerValue="20%"
          />
        </div>

        <NewTeamMembersCard />

        <div className="md:col-span-2 lg:col-span-1">
          <TeamPerformancesCard />
        </div>
      </div>
    </div>
  );
}
