import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AcceptWorkspaceInviteClient } from "@/components/auth/AcceptWorkspaceInviteClient";

export const metadata: Metadata = {
  title: "Accept invitation · FinConnex",
  description: "Accept a one-time workspace invitation",
};

export default function AcceptWorkspaceInvitePage() {
  return (
    <AuthCard
      title="Join workspace"
      subtitle="Accept the one-time invitation from your email to join this workspace."
      footer={
        <Link href="/login" className="font-medium text-violet-600 hover:text-violet-700">
          Back to sign in
        </Link>
      }
    >
      <Suspense
        fallback={
          <div className="flex h-20 items-center justify-center text-sm text-gray-400">
            Loading...
          </div>
        }
      >
        <AcceptWorkspaceInviteClient />
      </Suspense>
    </AuthCard>
  );
}
