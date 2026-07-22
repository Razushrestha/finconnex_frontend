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
  LINKTREE_STATUSES,
  getLinktreeById,
  upsertLinktreePage,
  type LinktreeLink,
  type LinktreePage,
  type LinktreeStatus,
} from "@/lib/marketing/linktree/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<LinktreeStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Live: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
};

export function LinktreeDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [page, setPage] = useState<LinktreePage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPage(getLinktreeById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function save(next: LinktreePage, msg?: string) {
    const normalized = {
      ...next,
      links: next.linkItems.length,
      updatedAt: new Date().toLocaleDateString("en-AU"),
    };
    upsertLinktreePage(normalized);
    setPage(normalized);
    if (msg) flash(msg);
  }

  function setStatus(status: LinktreeStatus) {
    if (!page) return;
    save({ ...page, status }, `Status → ${status}`);
  }

  function updateLink(linkId: string, patch: Partial<LinktreeLink>) {
    if (!page) return;
    save({
      ...page,
      linkItems: page.linkItems.map((l) =>
        l.id === linkId ? { ...l, ...patch } : l,
      ),
    });
  }

  function addLink() {
    if (!page) return;
    save({
      ...page,
      linkItems: [
        ...page.linkItems,
        { id: `l-${Date.now()}`, label: "New link", url: "#" },
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

  function copyPublic() {
    if (!page) return;
    void navigator.clipboard?.writeText(
      `${window.location.origin}/l/${page.slug}`,
    );
    flash("Public link copied");
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
            <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/linktree" className="hover:text-slate-600">
              Linktree
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">{page.pageId}</h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLE[page.status],
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
              Copy link
            </button>
            <Link
              href={`/l/${page.slug}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open public
            </Link>
          </div>
        </div>

        <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="text-xl font-bold text-slate-900">{page.title}</h2>
              {page.bio ? (
                <p className="mt-1 text-[13px] text-slate-500">{page.bio}</p>
              ) : null}
              <p className="mt-2 font-mono text-[11px] text-violet-700">
                /l/{page.slug}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Links
                </p>
                <button
                  type="button"
                  onClick={addLink}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {page.linkItems.map((l) => (
                  <div
                    key={l.id}
                    className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={l.label}
                      onChange={(e) =>
                        updateLink(l.id, { label: e.target.value })
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-violet-500"
                    />
                    <input
                      value={l.url}
                      onChange={(e) =>
                        updateLink(l.id, { url: e.target.value })
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(l.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Status
            </p>
            <div className="flex flex-wrap gap-1">
              {LINKTREE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
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
            <dl className="mt-5 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-slate-400">Views</dt>
                <dd className="font-semibold">{page.views.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Owner</dt>
                <dd className="font-medium">{page.owner}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Updated</dt>
                <dd className="font-medium">{page.updatedAt}</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center">
              <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Preview
              </p>
              <p className="mt-2 text-[13px] font-bold text-slate-900">
                {page.title}
              </p>
              {page.bio ? (
                <p className="mt-0.5 text-[11px] text-slate-500">{page.bio}</p>
              ) : null}
              <div className="mt-3 space-y-1.5">
                {page.linkItems.slice(0, 4).map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
