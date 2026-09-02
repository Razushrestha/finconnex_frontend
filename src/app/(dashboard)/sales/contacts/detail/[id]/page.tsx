"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  buildFlatContacts,
  ContactDetailView,
} from "@/components/sales/contacts/ContactDetailView";
import {
  getCrmContact,
  tryCrmContact,
} from "@/lib/contacts/api";
import { mergeCrmContactsIntoBoard } from "@/lib/contacts/store";
import { onRulesChange } from "@/lib/rules";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onRulesChange(() => setRevision((n) => n + 1));
  }, []);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void tryCrmContact(async () => {
      const remote = await getCrmContact(id);
      if (cancelled) return;
      if (remote) {
        mergeCrmContactsIntoBoard([remote]);
        setRevision((n) => n + 1);
      }
      if (!cancelled) setLoading(false);
    }).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const contacts = useMemo(() => buildFlatContacts(revision), [revision]);
  const index = contacts.findIndex((c) => c.id === params.id);
  const contact = index >= 0 ? contacts[index] : undefined;

  if (loading && !contact) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading contact…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Contact not found.
      </div>
    );
  }

  return (
    <ContactDetailView
      contact={contact}
      statusTitle={contact.statusTitle}
      statusDotColor={contact.statusDotColor}
      contacts={contacts}
      contactIndex={index}
    />
  );
}
