import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { isPlatformAdminRole } from "@/lib/auth/platform";
import { BRAND_COOKIE, parseRememberedBrand } from "@/lib/settings/brand";

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

  // A member an admin created replaces that password before anything else.
  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  // Authenticated but no real workspace yet (fresh signup) → onboarding
  if (session.hasWorkspace === false) {
    if (isPlatformAdminRole(session.role)) {
      redirect("/platform");
    }
    redirect("/create-workspace");
  }

  const initialBrand = parseRememberedBrand(
    (await cookies()).get(BRAND_COOKIE)?.value,
  );

  return (
    <DashboardShell session={session} initialBrand={initialBrand}>
      {children}
    </DashboardShell>
  );
}
