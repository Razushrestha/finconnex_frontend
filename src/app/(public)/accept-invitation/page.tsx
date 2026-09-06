"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** CRM invitation emails use `/accept-invitation#token=...`. */
export default function AcceptInvitationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token =
      params.get("token")?.trim() ||
      params.get("invitationToken")?.trim() ||
      "";
    router.replace(
      token
        ? `/invite/accept?token=${encodeURIComponent(token)}`
        : "/invite/accept",
    );
  }, [router]);

  return (
    <p className="p-8 text-center text-sm text-slate-600">
      Opening invitation…
    </p>
  );
}
