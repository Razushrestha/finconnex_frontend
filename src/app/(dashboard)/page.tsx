import { cookies } from "next/headers";
import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { getSession } from "@/lib/auth/session";
import {
  DASHBOARD_VIEW_COOKIE,
  isDashboardViewId,
  type DashboardViewId,
} from "@/lib/dashboard/views";

export const metadata: Metadata = {
  title: "Executive Overview: FinConnex",
  description: "Executive overview of pipeline, settlements, and team actions.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const fromUrl = Array.isArray(params.view) ? params.view[0] : params.view;
  const fromCookie = (await cookies()).get(DASHBOARD_VIEW_COOKIE)?.value;
  const initialView: DashboardViewId = isDashboardViewId(fromUrl)
    ? fromUrl
    : isDashboardViewId(fromCookie)
      ? fromCookie
      : "executive";
  return (
    <Suspense fallback={null}>
      <DashboardWorkspace
        sessionName={session?.name ?? ""}
        initialView={initialView}
      />
    </Suspense>
  );
}
