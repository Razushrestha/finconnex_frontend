"use client";

import { useEffect, useState } from "react";
import {
  Link2,
  QrCode,
  Sparkles,
  History,
  SlidersHorizontal,
  MoreVertical,
  CornerDownRight,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  X,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  createCrmSmartShortLink,
  deleteCrmSmartShortLink,
  listCrmSmartShortLinks,
  shortLinkPublicPath,
  shortLinkPublicUrl,
  type CrmSmartShortLink,
} from "@/lib/smart-links/api";
import {
  createSmartShortLink,
  listSmartShortLinks,
  qrImageUrl,
} from "@/lib/smart-links/short-links";

interface RecentLink {
  id: string;
  alias: string;
  shortUrl: string;
  destination: string;
  tag: string | null;
  clicks: string;
  created: string;
  hasQr?: boolean;
}

function displayHost(): string {
  if (typeof window === "undefined") return "finconnex.com";
  return window.location.host;
}

function relativeCreated(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Just now";
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function toRecentLink(row: CrmSmartShortLink): RecentLink {
  return {
    id: row.id,
    alias: row.alias,
    shortUrl: `${displayHost()}/go/${row.alias}`,
    destination: row.destination,
    tag: row.generateQr ? "QR" : null,
    clicks: row.clicks.toLocaleString(),
    created: relativeCreated(row.createdAt),
    hasQr: row.generateQr,
  };
}

export default function LinkShortener() {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [generateQr, setGenerateQr] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State for newly created link UI feedback & Modal
  const [recentLinks, setRecentLinks] = useState<RecentLink[]>([]);
  const [latestCreated, setLatestCreated] = useState<RecentLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hostLabel, setHostLabel] = useState("finconnex.com");

  // QR Modal State
  const [activeQrLink, setActiveQrLink] = useState<RecentLink | null>(null);

  // Delete Confirmation Modal State
  const [linkToDelete, setLinkToDelete] = useState<RecentLink | null>(null);

  const isUrlValid = destinationUrl.trim().length > 0;

  useEffect(() => {
    setHostLabel(displayHost());
    let cancelled = false;
    async function load() {
      try {
        const rows = await listCrmSmartShortLinks();
        if (!cancelled) setRecentLinks(rows.map(toRecentLink));
      } catch {
        if (cancelled) return;
        setRecentLinks(
          listSmartShortLinks().map((row) =>
            toRecentLink({
              id: row.id,
              alias: row.alias,
              destination: row.destination,
              clicks: row.clicks,
              generateQr: false,
              createdAt: row.createdAt,
            }),
          ),
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleShorten = async () => {
    if (!isUrlValid || isLoading) return;

    setIsLoading(true);
    setFormError(null);

    try {
      let row: CrmSmartShortLink;
      try {
        row = await createCrmSmartShortLink({
          destination: destinationUrl,
          alias: customAlias.trim() || undefined,
          generateQr,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/sign in/i.test(message)) throw error;
        const local = createSmartShortLink({
          destination: destinationUrl,
          alias: customAlias,
        });
        row = {
          id: local.id,
          alias: local.alias,
          destination: local.destination,
          clicks: local.clicks,
          generateQr,
          createdAt: local.createdAt,
        };
      }

      const newLink = toRecentLink(row);
      setRecentLinks((current) => [
        newLink,
        ...current.filter((item) => item.id !== newLink.id),
      ]);
      setLatestCreated(newLink);
      setDestinationUrl("");
      setCustomAlias("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not shorten that link",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (link: RecentLink) => {
    void navigator.clipboard.writeText(shortLinkPublicUrl(link.alias));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmDelete = async () => {
    if (!linkToDelete) return;
    try {
      await deleteCrmSmartShortLink(linkToDelete.id);
    } catch {
      // Local-only rows are removed from the list either way.
    }
    setRecentLinks((current) =>
      current.filter((link) => link.id !== linkToDelete.id),
    );
    if (latestCreated?.id === linkToDelete.id) {
      setLatestCreated(null);
    }
    setLinkToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white px-6 py-4">
      <div className="mx-auto w-full">
        {/* Shorten form card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Destination URL <span className="text-rose-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Link2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="Enter the url to shorten"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {!isUrlValid && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              A destination URL is required to shorten your link.
            </p>
          )}
          {formError ? (
            <p className="mt-1.5 text-[11px] text-rose-600">{formError}</p>
          ) : null}

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Custom back-half (optional)
              </label>
              <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-200">
                <span className="flex items-center bg-slate-100 px-3 text-sm text-slate-500">
                  {hostLabel}/go/
                </span>
                <input
                  type="text"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="custom-alias"
                  className="w-full min-w-0 flex-1 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pb-1 sm:pb-2.5">
              <QrCode className="h-4 w-4 flex-shrink-0 text-slate-500" />
              <span className="whitespace-nowrap text-sm text-slate-700">
                Generate QR code
              </span>
              <Switch
                checked={generateQr}
                onChange={setGenerateQr}
                label="Generate QR code"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!isUrlValid || isLoading}
              onClick={handleShorten}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Shortening...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Shorten link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Feedback Card with optional QR Display */}
        {latestCreated && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span>
                  Success! Your short link is:{" "}
                  <strong className="font-mono text-emerald-950">
                    {latestCreated.shortUrl}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(latestCreated)}
                  className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium border border-emerald-200 hover:bg-slate-50 shadow-sm"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={shortLinkPublicPath(latestCreated.alias)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Test Link</span>
                </a>
              </div>
            </div>

            {latestCreated.hasQr && (
              <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setActiveQrLink(latestCreated)}
                    className="h-14 w-14 rounded-lg bg-white p-1.5 border border-emerald-200 shadow-sm flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                    title="Click to view full QR code"
                  >
                    <img
                      src={qrImageUrl(shortLinkPublicUrl(latestCreated.alias), 112)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-950">
                      QR Code Generated
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Click preview to enlarge or download.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveQrLink(latestCreated)}
                  className="rounded bg-white px-3 py-1.5 text-xs font-medium border border-emerald-200 hover:bg-slate-50 shadow-sm text-emerald-900"
                >
                  View QR
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent links */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <History className="h-4 w-4 text-slate-500" />
            Recent links
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              type="button"
              aria-label="Filter links"
              className="hover:text-slate-600"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="hover:text-slate-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {recentLinks.map((link) => (
            <RecentLinkRow
              key={link.id}
              link={link}
              onOpenQr={(l) => setActiveQrLink(l)}
              onDeleteClick={(l) => setLinkToDelete(l)}
            />
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all links
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {activeQrLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setActiveQrLink(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <QrCode className="h-6 w-6" />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              QR Code Preview
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-mono truncate px-4">
              {activeQrLink.shortUrl}
            </p>

            <div className="my-6 mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 p-4 shadow-inner">
              <img
                src={qrImageUrl(shortLinkPublicUrl(activeQrLink.alias), 220)}
                alt={`QR code for ${activeQrLink.shortUrl}`}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex items-center gap-3">
              <a
                href={qrImageUrl(shortLinkPublicUrl(activeQrLink.alias), 512)}
                download={`smart-link-${activeQrLink.alias}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-all"
              >
                <Download className="h-4 w-4" />
                Download PNG
              </a>
              <button
                type="button"
                onClick={() => setActiveQrLink(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setLinkToDelete(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              Delete Link?
            </h3>
            <p className="mt-1 text-xs text-slate-500 px-4">
              Are you sure you want to delete{" "}
              <strong className="font-mono text-slate-700">
                {linkToDelete.shortUrl}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 shadow-sm transition-all"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
        style={{ height: "18px", width: "18px" }}
      />
    </button>
  );
}

interface RecentLinkRowProps {
  link: RecentLink;
  onOpenQr: (link: RecentLink) => void;
  onDeleteClick: (link: RecentLink) => void;
}

function RecentLinkRow({ link, onOpenQr, onDeleteClick }: RecentLinkRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm group">
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-indigo-600">
            {link.shortUrl}
          </span>
          {link.tag && (
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {link.tag}
            </span>
          )}
          {link.hasQr && (
            <button
              type="button"
              onClick={() => onOpenQr(link)}
              className="flex items-center gap-1 flex-shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="View QR Code"
            >
              <QrCode className="h-3 w-3" /> QR
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <CornerDownRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{link.destination}</span>
        </div>
      </div>

      <div className="ml-4 flex flex-shrink-0 items-center gap-6">
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Clicks
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {link.clicks}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Created
          </div>
          <div className="text-sm text-slate-600">{link.created}</div>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDeleteClick(link)}
          className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
          title="Delete link"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
