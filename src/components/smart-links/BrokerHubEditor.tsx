"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  CloudUpload,
  Link2,
  MessageSquare,
  Plus,
  Share2,
  Trash2,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkItem } from "./LinkItem";
import { AddLinkModal } from "./AddLinkModal";
import { SOCIAL_PLATFORM_META } from "./SocialMeta";
import { createEmptyLink } from "@/lib/broker-hub/types";
import {
  HUB_AVATAR_ACCEPT,
  readImageFileAsDataUrl,
} from "@/lib/broker-hub/avatar";
import type {
  BrokerHubConfig,
  BrokerHubLink,
  LinkIconType,
  SocialPlatform,
} from "@/lib/broker-hub/types";

const BIO_MAX_WORDS = 500;

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function limitToWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

interface BrokerHubEditorProps {
  config: BrokerHubConfig;
  onChange: (config: BrokerHubConfig) => void;
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function EditorCard({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
      {children}
    </span>
  );
}

export function BrokerHubEditor({ config, onChange }: BrokerHubEditorProps) {
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const patchProfile = (fields: Partial<BrokerHubConfig["profile"]>) => {
    const updatedProfile = { ...config.profile, ...fields };

    // Auto-generate slug from title if title is being changed and slug wasn't manually customized yet
    if (fields.title !== undefined) {
      updatedProfile.slug = fields.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    }

    onChange({ ...config, profile: updatedProfile });
  };

  const updateLink = (updated: BrokerHubLink) =>
    onChange({
      ...config,
      links: config.links.map((l) => (l.id === updated.id ? updated : l)),
    });

  const deleteLink = (id: string) =>
    onChange({ ...config, links: config.links.filter((l) => l.id !== id) });

  const addLink = (fields: {
    title: string;
    url: string;
    icon: LinkIconType;
  }) =>
    onChange({
      ...config,
      links: [
        ...config.links,
        { ...createEmptyLink(config.links.length, fields.icon), ...fields },
      ],
    });

  const addSocial = () => {
    onChange({
      ...config,
      socials: [
        ...(config.socials || []),
        {
          id: crypto.randomUUID(),
          platform: "facebook" as SocialPlatform,
          url: "",
        },
      ],
    });
  };

  const updateSocial = (
    id: string,
    fields: Partial<{ platform: SocialPlatform; url: string }>,
  ) => {
    onChange({
      ...config,
      socials: (config.socials || []).map((s) =>
        s.id === id ? { ...s, ...fields } : s,
      ),
    });
  };

  const deleteSocial = (id: string) => {
    onChange({
      ...config,
      socials: (config.socials || []).filter((s) => s.id !== id),
    });
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...config.links];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange({ ...config, links: next.map((l, i) => ({ ...l, order: i })) });
  };

  const handleAvatarPick = (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    void readImageFileAsDataUrl(file)
      .then((avatarUrl) => patchProfile({ avatarUrl }))
      .catch((err) =>
        setPhotoError(err instanceof Error ? err.message : "Could not upload photo"),
      );
  };

  return (
    <div className="space-y-4">
      <EditorCard
        icon={<User2 className="h-5 w-5" />}
        title="Profile information"
        subtitle="Update your basic details and personal information."
      >
        <div className="space-y-5">
          <div>
            <FieldLabel>Profile photo</FieldLabel>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-violet-200 to-indigo-400 ring-4 ring-violet-50">
                {config.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.profile.avatarUrl}
                    alt="Profile photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-white">
                    <User2 className="h-8 w-8" />
                  </span>
                )}
              </div>
              <label className="flex min-h-[84px] min-w-[220px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-center hover:border-violet-300 hover:bg-violet-50/40">
                <CloudUpload className="mb-1 h-5 w-5 text-violet-500" />
                <span className="text-[13px] font-semibold text-violet-600">
                  Upload photo
                </span>
                <span className="mt-0.5 text-[11px] text-slate-400">
                  JPG, PNG or WEBP, Max. 5MB
                </span>
                <input
                  type="file"
                  accept={HUB_AVATAR_ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    handleAvatarPick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {config.profile.avatarUrl ? (
              <button
                type="button"
                onClick={() => patchProfile({ avatarUrl: null })}
                className="mt-2 text-[12px] font-medium text-slate-500 hover:text-slate-800"
              >
                Remove photo
              </button>
            ) : null}
            {photoError ? (
              <p className="mt-2 text-[12px] font-medium text-rose-600">
                {photoError}
              </p>
            ) : null}
          </div>

          <label className="block">
            <FieldLabel>Profile title</FieldLabel>
            <span className="relative block">
              <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={config.profile.title}
                onChange={(e) => patchProfile({ title: e.target.value })}
                placeholder="Enter your name."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </span>
          </label>

          <label className="block">
            <FieldLabel>Profile slug (URL path)</FieldLabel>
            <span className="relative flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
              <span className="flex items-center gap-1.5 border-r border-slate-100 bg-slate-50 px-3 text-[13px] text-slate-500">
                <Link2 className="h-4 w-4 text-slate-400" />
                /
              </span>
              <input
                value={config.profile.slug}
                onChange={(e) =>
                  patchProfile({ slug: sanitizeSlug(e.target.value) })
                }
                placeholder="your-name"
                className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <label className="block">
            <FieldLabel>Bio</FieldLabel>
            <span className="relative block">
              <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                value={config.profile.bio}
                onChange={(e) =>
                  patchProfile({
                    bio: limitToWords(e.target.value, BIO_MAX_WORDS),
                  })
                }
                placeholder="Tell us about yourself..."
                rows={8}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 pb-8 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] text-slate-400">
                {countWords(config.profile.bio)}/{BIO_MAX_WORDS} words
              </span>
            </span>
          </label>
        </div>
      </EditorCard>

      <EditorCard
        icon={<Link2 className="h-5 w-5" />}
        title="Links"
        subtitle="Add your social links to connect with others."
        action={
          <button
            type="button"
            onClick={() => setAddLinkOpen(true)}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-violet-600 hover:text-violet-700"
          >
            <Plus className="h-4 w-4" />
            Add link
          </button>
        }
      >
        {config.links.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Link2 className="h-5 w-5" />
            </div>
            <p className="text-[13px] text-slate-500">
              No links yet. Add your first link to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.links
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((link, index) => (
                <div
                  key={link.id}
                  draggable
                  onDragStart={() => {
                    dragIndex.current = index;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverId(link.id);
                  }}
                  onDragLeave={() =>
                    setDragOverId((id) => (id === link.id ? null : id))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex.current !== null)
                      reorder(dragIndex.current, index);
                    dragIndex.current = null;
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    dragIndex.current = null;
                    setDragOverId(null);
                  }}
                  className={cn(
                    dragOverId === link.id &&
                      "rounded-lg outline-dashed outline-2 outline-violet-300",
                  )}
                >
                  <LinkItem
                    link={link}
                    onChange={updateLink}
                    onDelete={deleteLink}
                  />
                </div>
              ))}
          </div>
        )}
      </EditorCard>

      <EditorCard
        icon={<Share2 className="h-5 w-5" />}
        title="Social icons"
        subtitle="Choose which social icons to display on your profile."
        action={
          <button
            type="button"
            onClick={addSocial}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-violet-600 hover:text-violet-700"
          >
            <Plus className="h-4 w-4" />
            Add social
          </button>
        }
      >
        {(!config.socials || config.socials.length === 0) ? (
          <div className="h-2" />
        ) : (
          <div className="space-y-3">
            {config.socials.map((social) => (
              <div
                key={social.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
              >
                <select
                  value={social.platform}
                  onChange={(e) =>
                    updateSocial(social.id, {
                      platform: e.target.value as SocialPlatform,
                    })
                  }
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                >
                  {Object.entries(SOCIAL_PLATFORM_META).map(([plat, meta]) => (
                    <option key={plat} value={plat}>
                      {meta.label}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={social.url}
                  onChange={(e) =>
                    updateSocial(social.id, { url: e.target.value })
                  }
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] outline-none focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={() => deleteSocial(social.id)}
                  className="text-slate-400 hover:text-rose-600"
                  aria-label="Remove social"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </EditorCard>

      <AddLinkModal
        open={addLinkOpen}
        onClose={() => setAddLinkOpen(false)}
        onAdd={addLink}
      />
    </div>
  );
}
