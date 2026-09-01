"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Email } from "@/lib/emails/types";
import { findEmailById } from "@/lib/emails/store";
import { EmailDetailView } from "@/components/activities/emails/detail/EmailDetailView";
import { useModuleBack } from "@/hooks/useModuleBack";
import { onRulesChange } from "@/lib/rules";
import { onMailboxChange } from "@/lib/emails/mailbox";

export default function EmailDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const back = useModuleBack("/activities/emails", "Back to Emails");
  const [email, setEmail] = useState<Email | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function load() {
      setEmail(findEmailById(id)?.email ?? null);
      setReady(true);
    }
    load();
    const offRules = onRulesChange(load);
    const offMail = onMailboxChange(load);
    return () => {
      offRules();
      offMail();
    };
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading email…</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Email not found</p>
          <Link
            href={back.href}
            className="mt-3 inline-flex rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            {back.label}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EmailDetailView email={email} backHref={back.href} backLabel={back.label} />
    </div>
  );
}
