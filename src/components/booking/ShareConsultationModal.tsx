"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Download, Pencil, RefreshCw, X } from "lucide-react";
import { publicBookUrl } from "@/lib/booking/types";
import { saveOnceLink, saveShortLink } from "@/lib/booking/short-links";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

type ShareTab = "shorten" | "onetime" | "embed" | "slots";
type EmbedId = "inline" | "button" | "link";

const TABS: { id: ShareTab; label: string }[] = [
  { id: "shorten", label: "Shorten Link" },
  { id: "onetime", label: "One time Link" },
  { id: "embed", label: "Embed as Widget" },
  { id: "slots", label: "Copy Time Slots" },
];

function randomCode(len = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function CopyBlock({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="h-7 shrink-0 rounded-md px-2.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: BRAND }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        rows={Math.min(6, Math.max(2, Math.ceil(value.length / 52)))}
        className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white p-3 font-mono text-[11px] leading-relaxed break-all text-slate-700 outline-none"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}

export function ShareConsultationModal({
  title,
  slug,
  onClose,
}: {
  title: string;
  slug: string;
  onClose: () => void;
}) {
  const [path, setPath] = useState(slug);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<ShareTab>("shorten");
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [oneTime, setOneTime] = useState<string | null>(null);
  const [openEmbed, setOpenEmbed] = useState<EmbedId | null>(null);
  const [embedCopied, setEmbedCopied] = useState<string | null>(null);
  const [slotsCopied, setSlotsCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);
  const [onceCopied, setOnceCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const bookPath = publicBookUrl(path.trim() || slug);
  const bookUrl = `${origin}${bookPath}`;
  const shortUrl = shortCode ? `${origin}/s/${shortCode}` : null;
  const onceUrl = oneTime ? `${origin}/s/${oneTime}` : null;
  const displayUrl =
    tab === "shorten" && shortUrl
      ? shortUrl
      : tab === "onetime" && onceUrl
        ? onceUrl
        : bookUrl;

  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(displayUrl)}`,
    [displayUrl],
  );

  const embedOptions: {
    id: EmbedId;
    title: string;
    body: string;
    preview: ReactNode;
    snippet: string;
  }[] = [
    {
      id: "inline",
      title: "Inline Embed",
      body: "Displays the booking page directly within your website.",
      preview: <InlineEmbedPreview />,
      snippet: `<iframe src="${bookUrl}?embed=1" width="100%" height="720" frameborder="0" title="${title}"></iframe>`,
    },
    {
      id: "button",
      title: "Embed as Button",
      body: "Opens the booking page in a pop-up on button click.",
      preview: <ButtonEmbedPreview />,
      snippet: `<button onclick="window.open('${bookUrl}','booking','width=480,height=720')" style="background:#5A32A3;color:#fff;padding:10px 16px;border:0;border-radius:8px;font-weight:600;">Book Now</button>`,
    },
    {
      id: "link",
      title: "Embed as Link",
      body: "Opens the booking page in a pop-up through a clickable link.",
      preview: <LinkEmbedPreview />,
      snippet: `<a href="${bookUrl}" onclick="window.open(this.href,'booking','width=480,height=720');return false;">${title}</a>`,
    },
  ];

  const slots = [
    "Mon 18 Aug · 09:00 – 09:30",
    "Mon 18 Aug · 10:00 – 10:30",
    "Tue 19 Aug · 11:00 – 11:30",
    "Wed 20 Aug · 14:00 – 14:30",
  ];

  async function copyText(value: string, mark: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(value);
      mark(true);
      window.setTimeout(() => mark(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function generateShort() {
    const code = randomCode();
    saveShortLink(code, bookPath);
    setOneTime(null);
    setShortCopied(false);
    setShortCode(code);
  }

  function generateOnce() {
    const code = randomCode(10);
    saveOnceLink(code, bookPath);
    setShortCode(null);
    setOnceCopied(false);
    setOneTime(code);
  }

  async function downloadQr() {
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${slug}-booking-qr.png`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(qrSrc, "_blank", "noopener");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-[1px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="share-consultation-title"
        className="my-auto max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-5 pt-5 pb-1 sm:px-6 sm:pt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h2
            id="share-consultation-title"
            className="pr-10 text-[18px] font-bold tracking-tight text-slate-800"
          >
            Share - {title}
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="group/url flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-[#F3ECFB] py-1.5 pr-1.5 pl-3">
              {editing ? (
                <input
                  autoFocus
                  value={path}
                  onChange={(e) => {
                    setPath(e.target.value.replace(/^\//, ""));
                    setShortCode(null);
                    setOneTime(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditing(false);
                  }}
                  className="h-8 min-w-0 flex-1 rounded-md bg-white px-2 text-[12px] font-medium text-[#5A32A3] outline-none"
                />
              ) : (
                <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#5A32A3]">
                  {displayUrl}
                </p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={cn(
                  "shrink-0 text-slate-400 transition-opacity hover:text-slate-600",
                  editing
                    ? "opacity-100"
                    : "opacity-0 group-hover/url:opacity-100 focus-visible:opacity-100",
                )}
                aria-label="Edit link"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex h-6 w-6 shrink-0 items-center justify-center"
                aria-label="Confirm link"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => copyText(displayUrl, setCopied)}
                className="h-8 shrink-0 rounded-md px-3.5 text-[12px] font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShortCode(null);
                setOneTime(null);
                setPath(slug);
                setEditing(false);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#5A32A3] hover:bg-slate-50"
              aria-label="Reset link"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="Booking page QR code"
              width={88}
              height={88}
              className="h-[88px] w-[88px] shrink-0 rounded-md bg-white"
            />
            <div className="min-w-0">
              <p className="text-[13px] leading-relaxed text-slate-500">
                Share this QR code to open the booking page instantly on any
                device.
              </p>
              <button
                type="button"
                onClick={downloadQr}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3] hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Download QR
              </button>
            </div>
          </div>

          <div className="border-b border-[#E5E7EB]">
            <div className="-mb-px flex gap-5 overflow-x-auto">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "shrink-0 border-b-2 pb-2.5 text-[13px] font-medium whitespace-nowrap",
                    tab === item.id
                      ? "border-[#5A32A3] text-[#5A32A3]"
                      : "border-transparent text-slate-500 hover:text-slate-700",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "shorten" ? (
            <div className="space-y-3 pt-1 pb-2">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={generateShort}
                  className="h-10 rounded-lg border px-5 text-[13px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB]"
                  style={{ borderColor: BRAND }}
                >
                  Generate Shortened URL
                </button>
              </div>
              {shortUrl ? (
                <CopyBlock
                  label="Shortened URL"
                  value={shortUrl}
                  copied={shortCopied}
                  onCopy={() => copyText(shortUrl, setShortCopied)}
                />
              ) : (
                <p className="text-center text-[12px] text-slate-400">
                  Click Generate Shortened URL to create a shareable short link.
                </p>
              )}
            </div>
          ) : null}

          {tab === "onetime" ? (
            <div className="space-y-3 pt-1 pb-2">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={generateOnce}
                  className="h-10 rounded-lg border px-5 text-[13px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB]"
                  style={{ borderColor: BRAND }}
                >
                  Generate One Time Link
                </button>
              </div>
              {onceUrl ? (
                <CopyBlock
                  label="One time link"
                  value={onceUrl}
                  copied={onceCopied}
                  onCopy={() => copyText(onceUrl, setOnceCopied)}
                />
              ) : (
                <p className="text-center text-[12px] text-slate-400">
                  Click Generate One Time Link to create a single-use URL.
                </p>
              )}
            </div>
          ) : null}

          {tab === "embed" ? (
            <div className="space-y-3 pb-2">
              {embedOptions.map((option) => {
                const open = openEmbed === option.id;
                return (
                  <div
                    key={option.id}
                    className={cn(
                      "rounded-xl border bg-white",
                      open
                        ? "border-[#5A32A3]/50"
                        : "border-[#E5E7EB] hover:border-[#5A32A3]/30",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenEmbed((prev) =>
                          prev === option.id ? null : option.id,
                        )
                      }
                      className="flex w-full items-center gap-5 px-5 py-4 text-left"
                    >
                      {option.preview}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-slate-800">
                          {option.title}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-slate-500">
                          {option.body}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                          open && "rotate-180 text-[#5A32A3]",
                        )}
                      />
                    </button>
                    {open ? (
                      <div className="px-4 pb-4">
                        <CopyBlock
                          label="Embed code"
                          value={option.snippet}
                          copied={embedCopied === option.id}
                          onCopy={() =>
                            copyText(option.snippet, (v) =>
                              setEmbedCopied(v ? option.id : null),
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {tab === "slots" ? (
            <div className="space-y-3 pb-2">
              <ul className="space-y-1.5 text-[13px] text-slate-600">
                {slots.map((slot) => (
                  <li key={slot}>{slot}</li>
                ))}
              </ul>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => copyText(slots.join("\n"), setSlotsCopied)}
                  className="h-10 rounded-lg border px-5 text-[13px] font-semibold text-[#5A32A3] hover:bg-[#F3ECFB]"
                  style={{ borderColor: BRAND }}
                >
                  {slotsCopied ? "Copied" : "Copy Time Slots"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BrowserChrome({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-[72px] w-[96px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F3F4F6]">
      <span className="flex h-4 items-center gap-1 bg-white px-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#FBBF24]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
      </span>
      <span className="flex flex-1 items-center justify-center px-2 pb-1.5 pt-1">
        {children}
      </span>
    </span>
  );
}

function InlineEmbedPreview() {
  return (
    <BrowserChrome>
      <span className="grid w-full grid-cols-4 gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-3 items-center justify-center rounded-[2px] bg-white",
              i === 5 && "bg-[#5A32A3]",
            )}
          >
            {i === 5 ? (
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            ) : null}
          </span>
        ))}
      </span>
    </BrowserChrome>
  );
}

function ButtonEmbedPreview() {
  return (
    <BrowserChrome>
      <span className="relative h-full w-full rounded-[3px] bg-white">
        <span className="absolute top-1.5 left-1.5 h-1 w-6 rounded-sm bg-slate-200" />
        <span className="absolute top-3.5 left-1.5 h-1 w-8 rounded-sm bg-slate-100" />
        <span className="absolute right-1 bottom-1 h-2.5 w-5 rounded-[3px] bg-[#5A32A3]" />
      </span>
    </BrowserChrome>
  );
}

function LinkEmbedPreview() {
  return (
    <BrowserChrome>
      <span className="relative h-full w-full rounded-[3px] bg-white">
        <span className="absolute top-1.5 left-1.5 h-1 w-8 rounded-sm bg-slate-200" />
        <span className="absolute top-3.5 left-1.5 h-1 w-6 rounded-sm bg-slate-100" />
        <span className="absolute top-6 left-1.5 h-0.5 w-7 rounded-sm bg-[#5A32A3]" />
      </span>
    </BrowserChrome>
  );
}
