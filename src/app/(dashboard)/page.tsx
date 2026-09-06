import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";

export const metadata: Metadata = {
  title: "Executive Overview: FinConnex",
  description: "Executive overview of pipeline, settlements, and team actions.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardWorkspace />
    </Suspense>
  );
}
