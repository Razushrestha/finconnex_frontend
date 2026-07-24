"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  ExternalLink,
  Copy,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  LINKTREE_ACCENTS,
  LINKTREE_LINK_TYPES,
  LINKTREE_STATUS_STYLE,
  LINKTREE_STATUSES,
  bookingOptions,
  getLinktreeById,
  publicBookUrl,
  signatureLine,
  upsertLinktreePage,
  type LinktreeAccent,
  type LinktreeLink,
  type LinktreeLinkType,
  type LinktreePage,
  type LinktreeStatus,
} from "@/lib/marketing/linktree/types";
import { cn } from "@/lib/utils";

export function LinktreeDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [page, setPage] = useState<LinktreePage | null>(null);
  const [tab, setTab] = useState<"profile" | "links" | "share">("profile");
  const [books, setBooks] = useState<ReturnType<typeof bookingOptions>>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPage(getLinktreeById(id) ?? null);
    setBooks(bookingOptions());
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function save(next: LinktreePage, msg?: string) {
    const normalized = upsertLinktreePage({
      ...next,
      title: next.displayName,
      links: next.linkItems.length,
      updatedAt: new Date().toLocaleDateString("en-AU"),
    });
    setPage(normalized);
    if (msg) flash(msg);
  }

  function patch(partial: Partial<LinktreePage>, msg?: string) {
    if (!page) return;
    save({ ...page, ...partial }, msg);
  }

  function updateLink(linkId: string, p: Partial<LinktreeLink>) {
    if (!page) return;
    save({
      ...page,
      linkItems: page.linkItems.map((l) =>
        l.id === linkId ? { ...l, ...p } : l,
      ),
    });
  }

  function addLink() {
    if (!page) return;
    save({
      ...page,
      linkItems: [
        ...page.linkItems,
        {
          id: `l-${Date.now()}`,
          type: "Custom",
          label: "New link",
          url: "https://",
        },
      ],
    });
  }

  function removeLink(linkId: string) {
    if (!page) return;
    save({
      ...page,
      linkItems: page.linkItems.filter((l) => l.id !== linkId),
    });
  }

  function moveLink(index: number, dir: -1 | 1) {
    if (!page) return;
    const next = [...page.linkItems];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    save({ ...page, linkItems: next });
  }

  function copyPublic() {
    if (!page) return;
    void navigator.clipboard?.writeText(
      `${window.location.origin}/l/${page.slug}`,
    );
    flash("Public link copied");
  }

  function copySignature() {
    if (!page) return;
    void navigator.clipboard?.writeText(
      signatureLine(page, window.location.origin),
    );
    flash("Signature line copied");
  }

  if (!page) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <Link2 className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-900">Page not found</p>
        <Link
          href="/marketing/linktree"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_60%)]"
      />
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/marketing/linktree")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link
              href="/"
              className="flex items-center gap-0.5 hover:text-slate-600"
            >
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/linktree" className="hover:text-slate-600">
              Broker pages
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            {page.pageId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              LINKTREE_STATUS_STYLE[page.status],
            )}
          >
            {page.status}
          </span>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={copyPublic}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </button>
            <Link
              href={`/l/${page.slug}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview
            </Link>
          </div>
        </div>

        <div className="mb-2.5 flex gap-1 border-b border-slate-200">
          {(
            [
              ["profile", "Profile"],
              ["links", "Links"],
              ["share", "Share"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "border-b-2 px-3 py-2 text-[11px] font-semibold",
                tab === key
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Display name
                  </span>
                  <input
                    value={page.displayName}
                    onChange={(e) => patch({ displayName: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Role
                  </span>
                  <input
                    value={page.role ?? ""}
                    onChange={(e) => patch({ role: e.target.value })}
                    placeholder="Mortgage broker"
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Accent
                  </span>
                  <select
                    value={page.accent}
                    onChange={(e) =>
                      patch({ accent: e.target.value as LinktreeAccent })
                    }
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  >
                    {LINKTREE_ACCENTS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Bio
                  </span>
                  <textarea
                    value={page.bio ?? ""}
                    onChange={(e) => patch({ bio: e.target.value })}
                    rows={2}
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Photo URL
                  </span>
                  <input
                    value={page.avatarUrl ?? ""}
                    onChange={(e) => patch({ avatarUrl: e.target.value })}
                    placeholder="https://… (optional — initials if empty)"
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Phone
                  </span>
                  <input
                    value={page.phone ?? ""}
                    onChange={(e) => patch({ phone: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Email
                  </span>
                  <input
                    value={page.email ?? ""}
                    onChange={(e) => patch({ email: e.target.value })}
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    WhatsApp
                  </span>
                  <input
                    value={page.whatsapp ?? ""}
                    onChange={(e) => patch({ whatsapp: e.target.value })}
                    placeholder="+61…"
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Booking (§8)
                  </span>
                  <select
                    value={page.bookingSlug ?? ""}
                    onChange={(e) =>
                      patch({ bookingSlug: e.target.value || undefined })
                    }
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  >
                    <option value="">None</option>
                    {books.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Booking button label
                  </span>
                  <input
                    value={page.bookingLabel ?? ""}
                    onChange={(e) => patch({ bookingLabel: e.target.value })}
                    placeholder="Book a consult"
                    className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none"
                  />
                </label>
              </div>
            </div>
            <aside className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Status
              </p>
              <div className="flex flex-wrap gap-1">
                {LINKTREE_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ status: s }, `Status → ${s}`)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-semibold",
                      page.status === s
                        ? "bg-violet-600 text-white"
                        : "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Views</dt>
                  <dd className="font-semibold">
                    {page.views.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Owner</dt>
                  <dd className="font-medium">{page.owner}</dd>
                </div>
                {page.bookingSlug ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400">Book URL</dt>
                    <dd className="truncate font-mono text-[10px] text-violet-700">
                      {publicBookUrl(page.bookingSlug)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </aside>
          </div>
        ) : null}

        {tab === "links" ? (
          <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Link buttons ({page.linkItems.length})
              </p>
              <button
                type="button"
                onClick={addLink}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
              >
                <Plus className="h-3 w-3" />
                Add link
              </button>
            </div>
            <div className="space-y-2">
              {page.linkItems.map((l, index) => (
                <div
                  key={l.id}
                  className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:grid-cols-[110px_1fr_1fr_auto]"
                >
                  <select
                    value={l.type}
                    onChange={(e) =>
                      updateLink(l.id, {
                        type: e.target.value as LinktreeLinkType,
                      })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[11px] outline-none"
                  >
                    {LINKTREE_LINK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={l.label}
                    onChange={(e) => updateLink(l.id, { label: e.target.value })}
                    placeholder="Label"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none"
                  />
                  <input
                    value={l.url}
                    onChange={(e) => updateLink(l.id, { url: e.target.value })}
                    placeholder="/f/… or https://…"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      className="h-9 w-8 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      className="h-9 w-8 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(l.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
              Booking CTA is set under Profile (§8) and always appears first on
              the public page.
            </p>
          </div>
        ) : null}

        {tab === "share" ? (
          <div className="max-w-xl space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Public URL
              </div>
              <code className="block rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-800">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/l/${page.slug}`
                  : `/l/${page.slug}`}
              </code>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Email / Instagram signature
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
                {typeof window !== "undefined"
                  ? signatureLine(page, window.location.origin)
                  : signatureLine(page, "")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={copyPublic}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy URL
              </button>
              <button
                type="button"
                onClick={copySignature}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
              >
                Copy signature line
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
