import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { SignOutLink } from "@/components/auth/SignOutLink";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Change password · FinConnex",
  description: "Choose your own password for your FinConnex account",
};

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/change-password");
  }
  const required = session.mustChangePassword === true;

  return (
    <AuthCard
      title={required ? "Choose your password" : "Change password"}
      subtitle={
        required
          ? `Signed in as ${session.email}. Replace the password you were given before you continue — you'll then sign in again with the new one.`
          : "You'll be signed out everywhere and sign in again with the new password."
      }
      footer={<SignOutLink />}
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
