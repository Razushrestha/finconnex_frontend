import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/**
 * Auth routes (login) must never wrap the dashboard shell.
 * If the user is already signed in, send them to the dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return <>{children}</>;
}
