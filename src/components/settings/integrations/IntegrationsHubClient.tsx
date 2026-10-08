"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { WorkspacePortal } from "@/components/shared/WorkspacePortal";
import {
  getCalendlyConnection,
  listCalendarSyncConnections,
  type CalendarSyncConnection,
  type CalendlyConnection,
} from "@/lib/booking/calendly-integration-api";
import {
  getEquifaxConnection,
  getStripeConnection,
  listIntegrationConnections,
  listMessagingCredentials,
  listWebhookEndpoints,
  type EquifaxConnection,
  type IntegrationConnection,
  type MessagingCredential,
  type StripeConnection,
  type WebhookEndpoint,
} from "@/lib/integrations/api";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  oauthConnectionLabel,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

import {
  CalendarPanel,
  CalendlyPanel,
  EquifaxPanel,
  LinkPanel,
  MessagingPanel,
  OAuthPanel,
  StripePanel,
  WebhookPanel,
} from "./IntegrationPanels";

type Statuses = {
  stripe: StripeConnection | null;
  equifax: EquifaxConnection | null;
  messaging: MessagingCredential[];
  oauth: IntegrationConnection[];
  webhooks: WebhookEndpoint[];
  calendars: CalendarSyncConnection[];
  calendly: CalendlyConnection | null;
};

const EMPTY: Statuses = {
  stripe: null,
  equifax: null,
  messaging: [],
  oauth: [],
  webhooks: [],
  calendars: [],
  calendly: null,
};

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Whether a tile shows "Connected", from what the CRM reports. */
function isConnected(item: IntegrationDefinition, s: Statuses): boolean {
  const flow = item.flow;
  switch (flow.kind) {
    case "calendar":
      return s.calendars.some(
        (c) => c.connected && c.provider.toLowerCase().includes(flow.provider),
      );
    case "calendly":
      return !!s.calendly?.connected;
    case "stripe":
      return !!s.stripe?.connected;
    case "equifax":
      return !!s.equifax?.connected;
    case "messaging": {
      const cred = s.messaging.find((m) => m.provider === flow.provider);
      if (!cred) return false;
      if (flow.provider === "SENDGRID") return cred.hasApiKey;
      return flow.whatsapp
        ? cred.hasAuthToken && !!cred.whatsappFrom
        : cred.hasAuthToken;
    }
    case "webhook":
      return s.webhooks.some((w) => w.isActive);
    case "oauth":
      return s.oauth.some(
        (c) =>
          c.status === "CONNECTED" && c.label === oauthConnectionLabel(item),
      );
    default:
      return false;
  }
}

function Logo({
  item,
  size = 56,
}: {
  item: IntegrationDefinition;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (item.icon && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- brand mark from Simple Icons
      <img
        src={`https://cdn.simpleicons.org/${item.icon}`}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="object-contain"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: item.color }}
      className="flex items-center justify-center rounded-xl text-[18px] font-bold tracking-tight text-white"
    >
      {item.initials}
    </span>
  );
}

/**
 * Settings → Integrations: every third-party connection in one place, as
 * logo tiles. A tile opens its own setup — consent screen, API keys,
 * webhook URL or OAuth app — in a panel inside the working area.
 */
export function IntegrationsHubClient() {
  const [statuses, setStatuses] = useState<Statuses>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "All">("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    void Promise.allSettled([
      getStripeConnection(),
      getEquifaxConnection(),
      listMessagingCredentials(),
      listIntegrationConnections(),
      listWebhookEndpoints(),
      listCalendarSyncConnections(),
      getCalendlyConnection(),
    ]).then(
      ([stripe, equifax, messaging, oauth, webhooks, calendars, calendly]) => {
        if (!alive) return;
        setStatuses({
          stripe: settled(stripe, null),
          equifax: settled(equifax, null),
          messaging: settled(messaging, []),
          oauth: settled(oauth, []),
          webhooks: settled(webhooks, []),
          calendars: settled(calendars, []),
          calendly: settled(calendly, null),
        });
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [tick]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.blurb.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const open = INTEGRATIONS.find((item) => item.id === openId) ?? null;
  const connectedCount = INTEGRATIONS.filter((item) =>
    isConnected(item, statuses),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Integrations</h1>
          <p className="text-[13px] text-slate-500">
            Connect the apps FinConnex works with.
            {loading ? "" : ` ${connectedCount} connected.`}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations"
            aria-label="Search integrations"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-[13px] outline-none focus:border-[var(--brand-primary)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["All", ...INTEGRATION_CATEGORIES] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-medium",
              category === item
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary-faint)] text-[var(--brand-primary)]"
                : "border-slate-200 text-slate-600 hover:border-slate-300",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visible.map((item) => {
          const connected = isConnected(item, statuses);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(item.id)}
              className="group relative flex h-44 flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-4 text-center transition-shadow hover:border-slate-300 hover:shadow-md"
            >
              {connected ? (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Connected
                </span>
              ) : null}
              <Logo item={item} />
              <span className="text-[15px] font-semibold text-slate-900">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">
          No integrations match “{query}”.
        </p>
      ) : null}

      {open ? (
        <WorkspacePortal>
          <div
            className="fixed inset-0 z-[90] flex justify-end bg-slate-900/30"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpenId(null);
            }}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={open.name}
              className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <Logo item={open} size={40} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-semibold text-slate-900">
                    {open.name}
                  </h2>
                  <p className="text-[12px] text-slate-500">{open.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <Panel item={open} statuses={statuses} onChanged={refresh} />
              </div>
            </aside>
          </div>
        </WorkspacePortal>
      ) : null}
    </div>
  );
}

function Panel({
  item,
  statuses,
  onChanged,
}: {
  item: IntegrationDefinition;
  statuses: Statuses;
  onChanged: () => void;
}) {
  const flow = item.flow;
  switch (flow.kind) {
    case "calendar":
      return <CalendarPanel provider={flow.provider} />;
    case "calendly":
      return <CalendlyPanel onChanged={onChanged} />;
    case "stripe":
      return <StripePanel status={statuses.stripe} onChanged={onChanged} />;
    case "equifax":
      return <EquifaxPanel status={statuses.equifax} onChanged={onChanged} />;
    case "messaging":
      return (
        <MessagingPanel
          key={`${flow.provider}-${flow.whatsapp ? "wa" : "std"}`}
          provider={flow.provider}
          whatsapp={flow.whatsapp}
          credential={
            statuses.messaging.find((m) => m.provider === flow.provider) ?? null
          }
          onChanged={onChanged}
        />
      );
    case "webhook":
      return <WebhookPanel key={item.id} integration={item} />;
    case "oauth":
      return (
        <OAuthPanel
          key={item.id}
          integration={item}
          preset={flow.preset}
          connection={
            statuses.oauth.find(
              (c) => c.label === oauthConnectionLabel(item),
            ) ?? null
          }
          onChanged={onChanged}
        />
      );
    case "link":
      return <LinkPanel href={flow.href} cta={flow.cta} blurb={item.blurb} />;
  }
}
