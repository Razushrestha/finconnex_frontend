"use client";

import { useState } from "react";
import {
  Link2,
  QrCode,
  Sparkles,
  History,
  SlidersHorizontal,
  MoreVertical,
  CornerDownRight,
  ArrowRight,
} from "lucide-react";

const RECENT_LINKS = [
  {
    id: "q3-report",
    shortUrl: "finconnex.com/q3-report",
    destination:
      "https://finconnex.enterprise.com/reports/2023/q3-financial-sum...",
    tag: null,
    clicks: "1,248",
    created: "2d ago",
  },
  {
    id: "webinar-reg",
    shortUrl: "finconnex.com/webinar-reg",
    destination: "https://zoom.us/webinar/register/WN_xYz123AbcDe1",
    tag: "Campaign",
    clicks: "8,932",
    created: "1w ago",
  },
  {
    id: "onboarding-jdoe",
    shortUrl: "finconnex.com/onboarding-jdoe",
    destination:
      "https://app.finconnex.com/onboarding/portal?token=abc123xyz8...",
    tag: "Client",
    clicks: "3",
    created: "Oct 12",
  },
];

export default function LinkShortener() {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [generateQr, setGenerateQr] = useState(true);

  const handleShorten = () => {
    // TODO(api): POST to link-shortening endpoint with { destinationUrl, customAlias, generateQr }
    console.log("Shorten link", { destinationUrl, customAlias, generateQr });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white px-6 py-4">
      <div className="mx-auto w-full">
        {/* Shorten form card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Destination URL
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

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Custom back-half (optional)
              </label>
              <div className="mt-2 flex overflow-hidden rounded-lg border border-slate-200">
                <span className="flex items-center bg-slate-100 px-3 text-sm text-slate-500">
                  finconnex.com/
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
              onClick={handleShorten}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
            >
              <Sparkles className="h-4 w-4" />
              Shorten link
            </button>
          </div>
        </div>

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
          {RECENT_LINKS.map((link) => (
            <RecentLinkRow key={link.id} link={link} />
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

interface RecentLink {
  id: string;
  shortUrl: string;
  destination: string;
  tag: string | null;
  clicks: string;
  created: string;
}

function RecentLinkRow({ link }: { link: RecentLink }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-indigo-600">
            {link.shortUrl}
          </span>
          {link.tag && (
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {link.tag}
            </span>
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
      </div>
    </div>
  );
}
