"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, User, Type, Plus, Trash2 } from "lucide-react";
import {
  LINKTREE_STATUSES,
  nextLinktreeIds,
  upsertLinktreePage,
  type LinktreeLink,
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
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<LinktreeStatus>("Draft");
  const [owner, setOwner] = useState<string>(ACTIVITY_OWNERS[0]);
  const [linkItems, setLinkItems] = useState<LinktreeLink[]>([
    { id: "nl1", label: "Book a consult", url: "/book/" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (linkItems.length === 0) next.links = "Add at least one link";
    if (linkItems.some((l) => !l.label.trim() || !l.url.trim()))
      next.links = "Every link needs a label and URL";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextLinktreeIds(title);
    const created = upsertLinktreePage({
      id: ids.id,
      pageId: ids.pageId,
      title: title.trim(),
      slug: ids.slug,
      status,
      links: linkItems.length,
      linkItems,
      views: 0,
      owner,
      updatedAt: new Date().toLocaleDateString("en-AU"),
      bio: bio.trim() || undefined,
    });
    if (createAnother) {
      setTitle("");
      setBio("");
      setLinkItems([{ id: "nl1", label: "Book a consult", url: "/book/" }]);
      setErrors({});
      return;
    }
    router.push(`/marketing/linktree/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Linktree", href: "/marketing/linktree" }}
      badge="Links"
      title="Create Link Page"
      subtitle="A single public page of buttons for brokers and campaigns."
      tip="Title and at least one link are required."
      cardIcon={Link2}
      cardTitle="Link page"
      cardDescription="SRS §22 — live at /l/[slug]"
      listHref="/marketing/linktree"
      saveLabel="Save page"
      onSave={onSave}
    >
      <Field
        label="Title"
        required
        error={errors.title}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={Type} error={!!errors.title}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="John Smith — Broker links"
            className={elevatedInputClass(true)}
          />
        </InputShell>
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

      <Field label="Bio" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Mortgage broker · Sydney"
            className={elevatedTextareaClass}
            rows={2}
          />
        </TextAreaShell>
      </Field>

      <div className="sm:col-span-2 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Links
            {errors.links ? (
              <span className="normal-case text-rose-600">
                {" "}
                · {errors.links}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() =>
              setLinkItems((prev) => [
                ...prev,
                { id: `nl-${Date.now()}`, label: "", url: "" },
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
              className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-2.5 sm:grid-cols-[1fr_1fr_auto]"
            >
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
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-violet-500"
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
                placeholder="/book/… or https://…"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-violet-500"
              />
              <button
                type="button"
                onClick={() =>
                  setLinkItems((prev) => prev.filter((x) => x.id !== l.id))
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Remove"
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
