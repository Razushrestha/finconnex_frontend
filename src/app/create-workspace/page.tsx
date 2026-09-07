import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CreateWorkspaceForm } from "@/components/onboarding/CreateWorkspaceForm";

export const metadata: Metadata = {
  title: "Create your workspace: FinConnex",
  description: "Set up your FinConnex workspace",
};

export default async function CreateWorkspacePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // Already scoped to a real workspace — nothing to onboard.
  if (session.hasWorkspace !== false) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-gray-900">FinConnex</div>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as {session.email}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Create your workspace
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              You&apos;ll be the owner of this workspace and can invite your
              team afterward.
            </p>
          </div>

          <CreateWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
