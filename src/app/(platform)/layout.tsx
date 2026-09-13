import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isPlatformAdminRole } from "@/lib/auth/platform";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/platform");
  }
  if (!isPlatformAdminRole(session.role)) {
    redirect("/");
  }

  return (
    <PlatformShell
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
      }}
      tenant={{
        name: session.tenantName,
        hasWorkspace: session.hasWorkspace !== false && !!session.tenantId,
      }}
    >
      {children}
    </PlatformShell>
  );
}
