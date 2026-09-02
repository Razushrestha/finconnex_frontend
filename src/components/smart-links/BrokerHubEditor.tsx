"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  User2,
  Eye as EyeIcon,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkItem } from "./LinkItem";
import { AddLinkModal } from "./AddLinkModal";
import { SOCIAL_PLATFORM_META } from "./SocialMeta";
import { createEmptyLink } from "@/lib/broker-hub/types";
import type {
  BrokerHubConfig,
  BrokerHubLink,
  LinkIconType,
  SocialPlatform,
} from "@/lib/broker-hub/types";

interface BrokerHubEditorProps {
  config: BrokerHubConfig;
  onChange: (config: BrokerHubConfig) => void;
}

export function BrokerHubEditor({ config, onChange }: BrokerHubEditorProps) {
  const [profileOpen, setProfileOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);
  const [socialsOpen, setSocialsOpen] = useState(true);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
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
    const newSocial = {
      id: crypto.randomUUID(),
      platform: "facebook" as SocialPlatform,
      url: "",
    };
    onChange({
      ...config,
      socials: [...(config.socials || []), newSocial],
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
    const localUrl = URL.createObjectURL(file);
    patchProfile({ avatarUrl: localUrl });
  };

  return (
    <div className="space-y-4">
      {/* Profile section */}
      <section className="rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User2 className="h-4 w-4 text-muted-foreground" />
            Profile
          </span>
          {profileOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {profileOpen && (
          <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                {config.profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.profile.avatarUrl}
                    alt="Broker avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <User2 className="h-6 w-6" />
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleAvatarPick(e.target.files?.[0])}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Profile title
              </span>
              <input
                value={config.profile.title}
                onChange={(e) => patchProfile({ title: e.target.value })}
                placeholder="Enter your name"
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            {/* Added Visible Slug Input Field */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Profile Slug (URL path)
              </span>
              <div className="flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus-within:ring-1 focus-within:ring-primary">
                <span className="text-muted-foreground text-xs mr-0.5">/</span>
                <input
                  value={config.profile.slug}
                  onChange={(e) =>
                    patchProfile({
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  placeholder=""
                  className="w-full bg-transparent text-sm outline-none font-mono text-xs"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Bio
              </span>
              <textarea
                value={config.profile.bio}
                onChange={(e) => patchProfile({ bio: e.target.value })}
                placeholder=""
                rows={3}
                className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
        )}
      </section>

      {/* Links section */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <EyeIcon className="h-4 w-4 text-muted-foreground" />
            Links
          </span>
          <button
            type="button"
            onClick={() => setAddLinkOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add link
          </button>
        </div>

        <div className="space-y-2 border-t border-border px-4 pb-4 pt-3">
          {config.links.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No links yet — add your first one.
            </p>
          )}
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
                    "rounded-lg outline-dashed outline-2 outline-primary/40",
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
      </section>

      {/* Social Icons Section */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            Social Icons
          </span>
          <button
            type="button"
            onClick={addSocial}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add social
          </button>
        </div>

        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {(!config.socials || config.socials.length === 0) && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No social icons added yet.
            </p>
          )}
          {config.socials?.map((social) => (
            <div
              key={social.id}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-background"
            >
              <select
                value={social.platform}
                onChange={(e) =>
                  updateSocial(social.id, {
                    platform: e.target.value as SocialPlatform,
                  })
                }
                className="rounded border border-border bg-card px-2 py-1 text-xs"
              >
                {Object.keys(SOCIAL_PLATFORM_META).map((plat) => (
                  <option key={plat} value={plat}>
                    {plat.charAt(0).toUpperCase() + plat.slice(1)}
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
                className="w-full rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => deleteSocial(social.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <AddLinkModal
        open={addLinkOpen}
        onClose={() => setAddLinkOpen(false)}
        onAdd={addLink}
      />
    </div>
  );
}
