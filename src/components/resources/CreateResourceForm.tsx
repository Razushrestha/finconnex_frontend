"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  LibraryBig,
  FileText,
  Tag,
  Link2,
  Shield,
  User,
} from "lucide-react";
import {
  RESOURCE_ACCESS_LEVELS,
  RESOURCE_ACCESS_STYLE,
  RESOURCE_CATEGORIES,
  RESOURCE_OWNERS,
  RESOURCE_TYPE_STYLE,
  RESOURCE_TYPES,
  appendResourceAudit,
  formatResourceDate,
  looksLikeUrl,
  nextResourceIds,
  upsertResource,
  type ResourceAccess,
  type ResourceCategory,
  type ResourceType,
} from "@/lib/resources/types";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

interface Props {
  layoutId: string;
  redirect: boolean;
}

function CompactField({
  label,
  required,
  error,
  className,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-semibold text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[10px] font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function CreateResourceForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>("Document");
  const [category, setCategory] = useState<ResourceCategory>("Sales");
  const [fileOrUrl, setFileOrUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [accessLevel, setAccessLevel] = useState<ResourceAccess>("Internal");
  const [uploadedBy, setUploadedBy] = useState<string>(RESOURCE_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
    if (!fileOrUrl.trim()) next.fileOrUrl = "File or URL is required";
    if (!accessLevel) next.accessLevel = "Access level is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextResourceIds();
    const tags = tagsRaw
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const external = looksLikeUrl(fileOrUrl);
    const created = upsertResource(
      appendResourceAudit(
        {
          id: ids.id,
          resourceId: ids.resourceId,
          name: name.trim(),
          type,
          category,
          fileOrUrl: fileOrUrl.trim(),
          isExternalUrl: external,
          description: description.trim() || undefined,
          tags,
          accessLevel,
          uploadedBy,
          uploadDate: formatResourceDate(),
          downloadCount: 0,
          audit: [],
        },
        "Uploaded",
        uploadedBy,
      ),
    );
    if (createAnother) {
      setName("");
      setFileOrUrl("");
      setDescription("");
      setTagsRaw("");
      setErrors({});
      return;
    }
    router.push(`/resources/${created.id}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1100px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Upload resource
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSave(true)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Save &amp; new
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              Save resource
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3 rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-violet-700 uppercase">
              <LibraryBig className="h-3.5 w-3.5" />
              Resource details
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CompactField
                label="Name"
                required
                error={errors.name}
                className="sm:col-span-2"
              >
                <InputShell icon={FileText}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Home loan pitch deck"
                    className={elevatedInputClass(true)}
                  />
                </InputShell>
              </CompactField>

              <CompactField label="Type" required error={errors.type}>
                <InputShell icon={Tag}>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ResourceType)}
                    className={elevatedSelectClass(true)}
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </CompactField>

              <CompactField label="Category">
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ResourceCategory)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none focus:border-violet-500"
                >
                  {RESOURCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </CompactField>

              <CompactField
                label="File / URL"
                required
                error={errors.fileOrUrl}
                hint="Paste a URL or enter a file name (mock upload)"
                className="sm:col-span-2"
              >
                <InputShell icon={Link2}>
                  <input
                    value={fileOrUrl}
                    onChange={(e) => setFileOrUrl(e.target.value)}
                    placeholder="Pitch_Deck.pdf or https://…"
                    className={elevatedInputClass(true)}
                  />
                </InputShell>
              </CompactField>

              <CompactField
                label="Description"
                className="sm:col-span-2"
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short description of this resource…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-violet-400"
                />
              </CompactField>

              <CompactField
                label="Tags"
                hint="Comma-separated"
                className="sm:col-span-2"
              >
                <input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  placeholder="pitch, home-loan, collateral"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500"
                />
              </CompactField>

              <CompactField
                label="Access level"
                required
                error={errors.accessLevel}
              >
                <InputShell icon={Shield}>
                  <select
                    value={accessLevel}
                    onChange={(e) =>
                      setAccessLevel(e.target.value as ResourceAccess)
                    }
                    className={elevatedSelectClass(true)}
                  >
                    {RESOURCE_ACCESS_LEVELS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </CompactField>

              <CompactField label="Uploaded by">
                <InputShell icon={User}>
                  <select
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    className={elevatedSelectClass(true)}
                  >
                    {RESOURCE_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </InputShell>
              </CompactField>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
              <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Preview
              </div>
              <div className="space-y-2">
                <div className="text-[13px] font-bold text-slate-900">
                  {name.trim() || "Untitled resource"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      RESOURCE_TYPE_STYLE[type],
                    )}
                  >
                    {type}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                    {category}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                      RESOURCE_ACCESS_STYLE[accessLevel],
                    )}
                  >
                    {accessLevel}
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  {fileOrUrl.trim() || "No file / URL yet"}
                </p>
                {description.trim() ? (
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {description.trim()}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3 text-[10px] leading-relaxed text-violet-800">
              Public resources may be shared with clients. Restricted items stay
              with authorised staff only.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
