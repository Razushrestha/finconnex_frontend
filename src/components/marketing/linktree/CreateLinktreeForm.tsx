"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, User, Type, Plus, Trash2 } from "lucide-react";
import {
  LINKTREE_ACCENTS,
  LINKTREE_LINK_TYPES,
  LINKTREE_STATUSES,
  bookingOptions,
  nextLinktreeIds,
  upsertLinktreePage,
  type LinktreeAccent,
  type LinktreeLink,
  type LinktreeLinkType,
  type LinktreeStatus,
} from "@/lib/marketing/linktree/types";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateLinktreeForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("Mortgage broker");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bookingSlug, setBookingSlug] = useState("");
  const [bookingLabel, setBookingLabel] = useState("Book a consult");
  const [accent, setAccent] = useState<LinktreeAccent>("forest");
  const [status, setStatus] = useState<LinktreeStatus>("Draft");
  const [owner, setOwner] = useState<string>(ACTIVITY_OWNERS[0]);
  const [books, setBooks] = useState<ReturnType<typeof bookingOptions>>([]);
  const [linkItems, setLinkItems] = useState<LinktreeLink[]>([
    {
      id: "nl1",
      type: "Form",
      label: "Home loan enquiry",
      url: "/f/home-loan-lead",
    },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setBooks(bookingOptions());
  }, []);

  function validate() {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.displayName = "Display name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextLinktreeIds(displayName);
    const created = upsertLinktreePage({
      id: ids.id,
      pageId: ids.pageId,
      title: displayName.trim(),
      displayName: displayName.trim(),
      slug: ids.slug,
      status,
      role: role.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      bookingSlug: bookingSlug || undefined,
      bookingLabel: bookingLabel.trim() || "Book a consult",
      accent,
      links: linkItems.length,
      linkItems,
      views: 0,
      owner,
      updatedAt: new Date().toLocaleDateString("en-AU"),
    });
    if (createAnother) {
      setDisplayName("");
      setBio("");
      setErrors({});
      return;
    }
    router.push(`/marketing/linktree/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Broker pages", href: "/marketing/linktree" }}
      badge="§22"
      title="Create broker page"
      subtitle="Public profile with booking, contact, and social links."
      tip="Display name is required. Booking is optional (§8)."
      cardIcon={Link2}
      cardTitle="Broker profile"
      cardDescription="Live at /l/[slug] — for bios & email signatures"
      listHref="/marketing/linktree"
      saveLabel="Save page"
      onSave={onSave}
    >
      <Field
        label="Display name"
        required
        error={errors.displayName}
        className="sm:col-span-2"
      >
        <InputShell icon={Type} error={!!errors.displayName}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Smith"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Role">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-violet-500"
        />
      </Field>

      <Field label="Status">
        <InputShell>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LinktreeStatus)}
            className={elevatedSelectClass()}
          >
            {LINKTREE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Owner">
        <InputShell icon={User}>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Accent">
        <select
          value={accent}
          onChange={(e) => setAccent(e.target.value as LinktreeAccent)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none"
        >
          {LINKTREE_ACCENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Bio" className="col-span-full">
        <TextAreaShell>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="One short line clients will read under your name"
            className={elevatedTextareaClass}
            rows={2}
          />
        </TextAreaShell>
      </Field>

      <Field label="Phone">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none"
        />
      </Field>
      <Field label="Email">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none"
        />
      </Field>
      <Field label="WhatsApp">
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+61…"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none"
        />
      </Field>

      <Field label="Booking page (§8)" className="sm:col-span-2">
        <select
          value={bookingSlug}
          onChange={(e) => setBookingSlug(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none"
        >
          <option value="">None</option>
          {books.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Booking button label">
        <input
          value={bookingLabel}
          onChange={(e) => setBookingLabel(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none"
        />
      </Field>

      <div className="col-span-full">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Extra links
          </p>
          <button
            type="button"
            onClick={() =>
              setLinkItems((prev) => [
                ...prev,
                {
                  id: `nl-${Date.now()}`,
                  type: "Custom",
                  label: "",
                  url: "",
                },
              ])
            }
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
          >
            <Plus className="h-3 w-3" />
            Add link
          </button>
        </div>
        <div className="space-y-2">
          {linkItems.map((l) => (
            <div
              key={l.id}
              className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-2.5 sm:grid-cols-[110px_1fr_1fr_auto]"
            >
              <select
                value={l.type}
                onChange={(e) =>
                  setLinkItems((prev) =>
                    prev.map((x) =>
                      x.id === l.id
                        ? { ...x, type: e.target.value as LinktreeLinkType }
                        : x,
                    ),
                  )
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[11px]"
              >
                {LINKTREE_LINK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={l.label}
                onChange={(e) =>
                  setLinkItems((prev) =>
                    prev.map((x) =>
                      x.id === l.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                placeholder="Label"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none"
              />
              <input
                value={l.url}
                onChange={(e) =>
                  setLinkItems((prev) =>
                    prev.map((x) =>
                      x.id === l.id ? { ...x, url: e.target.value } : x,
                    ),
                  )
                }
                placeholder="URL"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setLinkItems((prev) => prev.filter((x) => x.id !== l.id))
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </CreateEntityFormShell>
  );
}
