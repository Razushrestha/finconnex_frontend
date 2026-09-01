import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password · FinConnex",
  description: "Choose a new password for your FinConnex account",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Choose a new password using the one-time link from your email."
      footer={
        <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
          Back to sign in
        </Link>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-24 items-center justify-center text-sm text-gray-400">
            Loading...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
