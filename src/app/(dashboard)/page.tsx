import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";

export const metadata: Metadata = {
  title: "Dashboard: FinConnex",
  description: "CRM overview with sales, finance, and team insights.",
};

export default function DashboardPage() {
  return <DashboardWorkspace />;
}
