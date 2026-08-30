import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify email · FinConnex",
  description: "Confirm your FinConnex account email",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      subtitle="Confirm ownership with the link we sent, or request a new message."
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
        <VerifyEmailClient />
      </Suspense>
    </AuthCard>
  );
}
