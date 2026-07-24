"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Trash2,
  Download,
  Share2,
  Save,
  ExternalLink,
  Pencil,
  Activity,
  LayoutGrid,
} from "lucide-react";
import {
  RESOURCE_ACCESS_LEVELS,
  RESOURCE_ACCESS_STYLE,
  RESOURCE_CATEGORIES,
  RESOURCE_OWNERS,
  RESOURCE_SHARE_TARGETS,
  RESOURCE_TYPE_STYLE,
  RESOURCE_TYPES,
  appendResourceAudit,
  bumpDownload,
  deleteResource,
  getResourceById,
  looksLikeUrl,
  upsertResource,
  type ResourceAccess,
  type ResourceCategory,
  type ResourceItem,
  type ResourceType,
} from "@/lib/resources/types";
import { cn } from "@/lib/utils";
import {
  fieldDiff,
  logEdit,
  softDeleteRecord,
  stripSystemFields,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function ResourceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<ResourceItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "edit" | "activity">("overview");
  const [dirty, setDirty] = useState(false);
  const [shareTarget, setShareTarget] = useState("Sales team");

  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("Document");
  const [category, setCategory] = useState<ResourceCategory>("Sales");
  const [fileOrUrl, setFileOrUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [accessLevel, setAccessLevel] = useState<ResourceAccess>("Internal");
  const [uploadedBy, setUploadedBy] = useState("");

  useEffect(() => {
    const r = getResourceById(id) ?? null;
    setRow(r);
    if (r) hydrate(r);
  }, [id]);

  function hydrate(r: ResourceItem) {
    setName(r.name);
    setType(r.type);
    setCategory(r.category);
    setFileOrUrl(r.fileOrUrl);
    setDescription(r.description ?? "");
    setTagsRaw(r.tags.join(", "));
    setAccessLevel(r.accessLevel);
    setUploadedBy(r.uploadedBy);
    setShareTarget(r.sharedWith ?? "Sales team");
    setDirty(false);
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  function persist(next: ResourceItem, msg?: string) {
    upsertResource(next);
    setRow(next);
    hydrate(next);
    if (msg) flash(msg);
  }

  function onDownload() {
    if (!row) return;
    const actor = uploadedBy || row.uploadedBy;
    if (row.isExternalUrl || looksLikeUrl(row.fileOrUrl)) {
      window.open(row.fileOrUrl, "_blank", "noopener,noreferrer");
    } else {
      const blob = new Blob(
        [
          `FinConnex resource mock download\n`,
          `ID: ${row.resourceId}\n`,
          `Name: ${row.name}\n`,
          `File: ${row.fileOrUrl}\n`,
        ],
        { type: "text/plain" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileOrUrl || `${row.resourceId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    persist(bumpDownload(row, actor), "Download recorded");
  }

  function onShare() {
    if (!row) return;
    persist(
      appendResourceAudit(
        { ...row, sharedWith: shareTarget },
        `Shared with ${shareTarget}`,
        row.uploadedBy,
      ),
      `Shared with ${shareTarget}`,
    );
  }

  function onSaveEdit() {
    if (!row) return;
    if (!name.trim() || !fileOrUrl.trim()) {
      flash("Name and File/URL are required");
      return;
    }
    const tags = tagsRaw
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const patch = stripSystemFields({
      name: name.trim(),
      type,
      category,
      fileOrUrl: fileOrUrl.trim(),
      isExternalUrl: looksLikeUrl(fileOrUrl),
      description: description.trim() || undefined,
      tags,
      accessLevel,
      uploadedBy,
    });
    const next = appendResourceAudit(
      { ...row, ...patch },
      "Edited",
      uploadedBy || row.uploadedBy,
    );
    const changes = fieldDiff(
      row as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
      ["name", "type", "category", "fileOrUrl", "description", "tags", "accessLevel", "uploadedBy"],
    );
    logEdit(
      "resources",
      uploadedBy || row.uploadedBy,
      row.id,
      row.resourceId,
      changes,
    );
    persist(next, "Resource updated");
    setTab("overview");
  }

  function onDelete() {
    if (!row) return;
    if (!window.confirm(`Delete ${row.resourceId}?`)) return;
    const gate = softDeleteRecord({
      action: "resources.delete",
      module: "resources",
      recordId: row.id,
      recordLabel: row.resourceId,
      recordType: "Resource",
      snapshot: row,
    });
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    deleteResource(row.id);
    router.push("/resources");
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            Resource not found
          </p>
          <Link
            href="/resources"
            className="mt-2 inline-block text-[12px] font-semibold text-violet-600"
          >
            Back to resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1200px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/resources")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
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
                <Link href="/resources" className="hover:text-slate-600">
                  Resources
                </Link>
                <span>/</span>
              </nav>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[16px] font-bold tracking-tight text-slate-900">
                {row.resourceId}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  RESOURCE_TYPE_STYLE[row.type],
                )}
              >
                {row.type}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  RESOURCE_ACCESS_STYLE[row.accessLevel],
                )}
              >
                {row.accessLevel}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] font-medium text-slate-700">
              {row.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white hover:bg-violet-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
          <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Share with
          </span>
          <select
            value={shareTarget}
            onChange={(e) => setShareTarget(e.target.value)}
            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] outline-none"
          >
            {RESOURCE_SHARE_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {row.sharedWith ? (
            <span className="text-[11px] text-slate-500">
              Last shared: {row.sharedWith}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] text-slate-500">
            {row.downloadCount} downloads
          </span>
        </div>

        <div className="mb-2.5 flex gap-1 border-b border-slate-200">
          {(
            [
              ["overview", LayoutGrid, "Overview"],
              ["edit", Pencil, "Edit"],
              ["activity", Activity, "Activity"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-semibold",
                tab === key
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {key === "edit" && dirty ? (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              ) : null}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Category
                  </dt>
                  <dd className="mt-0.5 text-[12px] font-medium text-slate-800">
                    {row.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Uploaded by
                  </dt>
                  <dd className="mt-0.5 text-[12px] font-medium text-slate-800">
                    {row.uploadedBy}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Upload date
                  </dt>
                  <dd className="mt-0.5 text-[12px] font-medium text-slate-800">
                    {row.uploadDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Download count
                  </dt>
                  <dd className="mt-0.5 text-[12px] font-medium text-slate-800">
                    {row.downloadCount}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    File / URL
                  </dt>
                  <dd className="mt-0.5 flex items-center gap-2 text-[12px] font-medium text-slate-800">
                    <span className="truncate">{row.fileOrUrl}</span>
                    {row.isExternalUrl ? (
                      <a
                        href={row.fileOrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-violet-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </a>
                    ) : null}
                  </dd>
                </div>
                {row.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      Description
                    </dt>
                    <dd className="mt-0.5 text-[12px] leading-relaxed text-slate-700">
                      {row.description}
                    </dd>
                  </div>
                ) : null}
                {row.tags.length ? (
                  <div className="sm:col-span-2">
                    <dt className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      Tags
                    </dt>
                    <dd className="flex flex-wrap gap-1">
                      {row.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <aside className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
              <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Quick actions
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={onDownload}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-violet-600" />
                  Download / open
                </button>
                <button
                  type="button"
                  onClick={() => setTab("edit")}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5 text-violet-600" />
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Share2 className="h-3.5 w-3.5 text-violet-600" />
                  Share again
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {tab === "edit" ? (
          <div className="space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Type *
                </span>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as ResourceType);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ResourceCategory);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                >
                  {RESOURCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  File / URL *
                </span>
                <input
                  value={fileOrUrl}
                  onChange={(e) => {
                    setFileOrUrl(e.target.value);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDirty(true);
                  }}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-violet-400"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Tags
                </span>
                <input
                  value={tagsRaw}
                  onChange={(e) => {
                    setTagsRaw(e.target.value);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Access level *
                </span>
                <select
                  value={accessLevel}
                  onChange={(e) => {
                    setAccessLevel(e.target.value as ResourceAccess);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                >
                  {RESOURCE_ACCESS_LEVELS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Uploaded by
                </span>
                <select
                  value={uploadedBy}
                  onChange={(e) => {
                    setUploadedBy(e.target.value);
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                >
                  {RESOURCE_OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-1.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  hydrate(row);
                  setTab("overview");
                }}
                className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </button>
            </div>
          </div>
        ) : null}

        {tab === "activity" ? (
          <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
            {row.audit.length === 0 ? (
              <p className="text-[12px] text-slate-400">No activity yet</p>
            ) : (
              <ul className="space-y-2">
                {[...row.audit].reverse().map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-slate-50 pb-2 text-[12px] last:border-0"
                  >
                    <span className="font-semibold text-slate-800">
                      {a.action}
                    </span>
                    <span className="text-slate-500">{a.actor}</span>
                    <span className="ml-auto text-[10px] text-slate-400">
                      {a.at}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="mt-3">
          <RecordAuditHistory
            module="resources"
            recordId={row.id}
            localAudit={row.audit}
          />
        </div>
      </div>
    </div>
  );
}
