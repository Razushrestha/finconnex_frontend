import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // No session → never render dashboard chrome; send to login
  if (!session) {
    redirect("/login");
  }

  // Authenticated but no real workspace yet (fresh signup) → onboarding
  if (session.hasWorkspace === false) {
    redirect("/create-workspace");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
