"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  Globe,
  Info,
  Mail,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
  User,
  Wand2,
  Code,
  Share2,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrokerHubTemplate } from "@/lib/broker-hub/templates";

const BUILDER_PATH = "/smart-link/builder";
const LIBRARY_PATH = "/smart-link/templates";
const BIO_MAX_LENGTH = 300;
const DRAFT_STORAGE_KEY = "broker-hub-draft";

type SocialPlatform = "globe" | "code" | "share" | "chat" | "mail";

interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  value: string;
  placeholder: string;
}

interface EditableLink {
  id: string;
  title: string;
  url: string;
  icon: "link" | "file" | "calendar";
  highlight: boolean;
}

const SOCIAL_ICONS: Record<SocialPlatform, typeof Globe> = {
  globe: Globe,
  code: Code,
  share: Share2,
  chat: MessageSquare,
  mail: Mail,
};

export default function TemplateConfigurePage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const template = getBrokerHubTemplate(templateId);

  // Form states
  const [profileName, setProfileName] = useState(template?.profile.title ?? "");
  const [currentTitle, setCurrentTitle] = useState("Chief Strategy Officer");
  const [bio, setBio] = useState(template?.profile.bio ?? "");

  // Style and layout customization states
  const [theme, setTheme] = useState<
    "default" | "midnight" | "sunset" | "emerald"
  >("default");
  const [fontStyle, setFontStyle] = useState<"sans" | "serif" | "mono">("sans");
  const [headerStyle, setHeaderStyle] = useState<
    "centered" | "split" | "minimal"
  >("centered");
  const [footerStyle, setFooterStyle] = useState<
    "minimal" | "branded" | "expanded"
  >("minimal");

  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );

  // Fully editable accounts state
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { id: "1", platform: "globe", value: "", placeholder: "yourdomain.com" },
    {
      id: "2",
      platform: "code",
      value: "",
      placeholder: "github.com/username",
    },
    { id: "3", platform: "mail", value: "", placeholder: "you@domain.com" },
  ]);

  // Fully editable featured links state
  const [links, setLinks] = useState<EditableLink[]>(
    template?.links?.map((l, index) => ({
      id: String(index),
      title: l.title,
      url: l.url,
      icon: (l.icon as any) || "link",
      highlight: l.highlight ?? false,
    })) || [],
  );

  const bioLength = bio.length;

  const updateAccount = (
    id: string,
    field: "platform" | "value",
    val: string,
  ) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== id) return acc;
        if (field === "platform") {
          const plat = val as SocialPlatform;
          return {
            ...acc,
            platform: plat,
            placeholder: getPlaceholderForPlatform(plat),
          };
        }
        return { ...acc, value: val };
      }),
    );
  };

  const getPlaceholderForPlatform = (plat: SocialPlatform) => {
    switch (plat) {
      case "code":
        return "github.com/username";
      case "share":
        return "linkedin.com/in/username";
      case "chat":
        return "twitter.com/username";
      case "mail":
        return "you@domain.com";
      default:
        return "yourdomain.com";
    }
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const addAccount = () => {
    setAccounts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        platform: "code",
        value: "",
        placeholder: "github.com/username",
      },
    ]);
  };

  const updateLink = (id: string, field: keyof EditableLink, val: any) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
    );
  };

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: "New Link Title",
        url: "",
        icon: "link",
        highlight: false,
      },
    ]);
  };

  const handleUseTemplate = () => {
    const draft = {
      templateId,
      profile: {
        slug: "",
        avatarUrl: null,
        title: profileName,
        bio,
      },
      currentTitle,
      accounts: accounts.filter((a) => a.value.trim().length > 0),
      links,
      customization: {
        theme,
        fontStyle,
        headerStyle,
        footerStyle,
      },
    };

    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push(`${BUILDER_PATH}?template=${templateId}`);
  };

  const themeClasses = {
    default: "bg-card text-card-foreground",
    midnight: "bg-slate-950 text-slate-50 border-slate-800",
    sunset: "bg-amber-950/20 text-amber-950 border-amber-200",
    emerald: "bg-emerald-950/20 text-emerald-950 border-emerald-200",
  }[theme];

  const fontClass = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono",
  }[fontStyle];

  if (!template) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find that template.
        </p>
        <button
          type="button"
          onClick={() => router.push(LIBRARY_PATH)}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push(LIBRARY_PATH)}
            className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseTemplate}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Use This Template
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_440px]">
        {/* Preview panel */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              Template Preview
            </span>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={cn(
                  "rounded p-1",
                  previewDevice === "desktop"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={cn(
                  "rounded p-1",
                  previewDevice === "mobile"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-border p-5 transition-all shadow-sm",
              themeClasses,
              fontClass,
            )}
          >
            <div
              className={cn(
                "mx-auto space-y-5 transition-all",
                previewDevice === "mobile" ? "max-w-[300px]" : "max-w-none",
              )}
            >
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-purple-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
              </div>

              {/* Dynamic Header Style Render */}
              <div
                className={cn(
                  "flex gap-3",
                  headerStyle === "centered" &&
                    "flex-col items-center text-center",
                  headerStyle === "split" && "flex-row items-center text-left",
                  headerStyle === "minimal" && "flex-col items-start text-left",
                )}
              >
                <div
                  className={cn(
                    "overflow-hidden rounded-full bg-muted ring-2 ring-border shrink-0",
                    headerStyle === "split" ? "h-14 w-14" : "h-20 w-20",
                  )}
                />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {profileName || "Your name here"}
                  </h3>
                  <p className="text-sm font-medium text-primary">
                    {currentTitle || "Your title here"}
                  </p>
                  <p className="max-w-sm text-xs leading-relaxed opacity-80">
                    {bio || "Your bio will appear here..."}
                  </p>

                  {/* Connected Accounts Preview */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {accounts.map((acc) => {
                      const IconComponent = SOCIAL_ICONS[acc.platform] || Globe;
                      return (
                        <span
                          key={acc.id}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border transition-all",
                            acc.value.trim()
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border opacity-60",
                          )}
                        >
                          <IconComponent className="h-3 w-3" />
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Featured Links Preview */}
              <div className="rounded-xl border border-border/60 p-4 space-y-2 bg-background/40">
                <span className="text-[10px] font-medium tracking-wide opacity-70 uppercase">
                  Featured Links
                </span>
                <div className="space-y-2 mt-2">
                  {links.length > 0 ? (
                    links.map((link) => (
                      <div
                        key={link.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-all",
                          link.highlight
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background/80",
                        )}
                      >
                        <span className="truncate">
                          {link.title || "Untitled Link"}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3 text-xs opacity-60">
                      No links added yet
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Preview */}
              <div
                className={cn(
                  "pt-2 text-center text-[10px] opacity-60 border-t border-border/40",
                  footerStyle === "expanded" &&
                    "py-4 flex justify-between items-center",
                )}
              >
                <span>Powered by Broker Hub</span>
                {footerStyle === "expanded" && (
                  <span>{profileName || "Professional Hub"}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Configure panel */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Configure Template
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize text, styling, social handles, and featured links.
            </p>
          </div>

          <div className="space-y-5">
            {/* Profile Info */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-card/50">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Profile Details
              </span>
              <label className="block text-xs font-medium text-muted-foreground">
                Profile Name
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Current Title
                <input
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none"
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Primary Bio
                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value.slice(0, BIO_MAX_LENGTH))
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none"
                />
              </label>
            </div>

            {/* Style Customization */}
            <div className="space-y-4 rounded-xl border border-border p-4 bg-card/50">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Theme & Layout
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-muted-foreground">
                  Theme
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                  >
                    <option value="default">Default Clean</option>
                    <option value="midnight">Midnight Slate</option>
                    <option value="sunset">Sunset Warm</option>
                    <option value="emerald">Emerald Trust</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Font
                  <select
                    value={fontStyle}
                    onChange={(e) => setFontStyle(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                  >
                    <option value="sans">Sans-Serif</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Monospace</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-muted-foreground">
                  Header Style
                  <select
                    value={headerStyle}
                    onChange={(e) => setHeaderStyle(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                  >
                    <option value="centered">Centered</option>
                    <option value="split">Split Row</option>
                    <option value="minimal">Minimal Left</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Footer Style
                  <select
                    value={footerStyle}
                    onChange={(e) => setFooterStyle(e.target.value as any)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="branded">Branded</option>
                    <option value="expanded">Expanded Split</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Social Accounts */}
            <div className="space-y-3 rounded-xl border border-border p-4 bg-card/50">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Connected Social Accounts
              </span>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-background p-1.5"
                    >
                      <select
                        value={acc.platform}
                        onChange={(e) =>
                          updateAccount(acc.id, "platform", e.target.value)
                        }
                        className="rounded bg-muted px-2 py-1 text-xs text-foreground outline-none"
                      >
                        <option value="globe">Website</option>
                        <option value="code">Code / GitHub</option>
                        <option value="share">Network / Profile</option>
                        <option value="chat">Chat / Social</option>
                        <option value="mail">Email</option>
                      </select>
                      <input
                        value={acc.value}
                        onChange={(e) =>
                          updateAccount(acc.id, "value", e.target.value)
                        }
                        placeholder={acc.placeholder}
                        className="w-full bg-transparent text-xs outline-none px-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeAccount(acc.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={addAccount}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Add Social Account
              </button>
            </div>

            {/* Featured Links Customization */}
            <div className="space-y-3 rounded-xl border border-border p-4 bg-card/50">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Featured Links
              </span>
              <div className="space-y-3">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="space-y-2 rounded-lg border border-border/80 bg-background p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={link.title}
                        onChange={(e) =>
                          updateLink(link.id, "title", e.target.value)
                        }
                        placeholder="Link title"
                        className="w-full bg-transparent text-xs font-medium outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(link.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={link.highlight}
                          onChange={(e) =>
                            updateLink(link.id, "highlight", e.target.checked)
                          }
                          className="rounded border-border"
                        />
                        Highlight
                      </label>
                      <select
                        value={link.icon}
                        onChange={(e) =>
                          updateLink(link.id, "icon", e.target.value)
                        }
                        className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
                      >
                        <option value="link">Link Icon</option>
                        <option value="file">File Icon</option>
                        <option value="calendar">Calendar Icon</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLink}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Add Featured Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
