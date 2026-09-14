import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Executive Overview: FinConnex",
  description: "Executive overview of pipeline, settlements, and team actions.",
};

export default async function DashboardPage() {
  const session = await getSession();
  return (
    <Suspense fallback={null}>
      <DashboardWorkspace sessionName={session?.name ?? ""} />
    </Suspense>
  );
}
