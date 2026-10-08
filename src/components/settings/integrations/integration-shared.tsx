"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { openIntegrationTab } from "@/lib/integrations/open-tab";

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
  oauthConnectionLabel,
  type IntegrationDefinition,
} from "@/lib/integrations/catalog";

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

export type IntegrationStatuses = {
  stripe: StripeConnection | null;
  equifax: EquifaxConnection | null;
  messaging: MessagingCredential[];
  oauth: IntegrationConnection[];
  webhooks: WebhookEndpoint[];
  calendars: CalendarSyncConnection[];
  calendly: CalendlyConnection | null;
};

const EMPTY: IntegrationStatuses = {
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

/** Every connection's state, from the CRM; `refresh` reloads it after a change. */
export function useIntegrationStatuses() {
  const [statuses, setStatuses] = useState<IntegrationStatuses>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
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

  // An app's setup happens in another tab: re-read on return.
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  return { statuses, loading, refresh };
}

/** Whether a tile shows "Connected", from what the CRM reports. */
export function isIntegrationConnected(
  item: IntegrationDefinition,
  s: IntegrationStatuses,
): boolean {
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

export function IntegrationLogo({
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
      style={{
        width: size,
        height: size,
        background: item.color,
        fontSize: size * 0.32,
      }}
      className="flex items-center justify-center rounded-xl font-bold tracking-tight text-white"
    >
      {item.initials}
    </span>
  );
}

/** The integration's own setup: consent screen, keys, webhook URL or OAuth app. */
function IntegrationSetup({
  item,
  statuses,
  onChanged,
}: {
  item: IntegrationDefinition;
  statuses: IntegrationStatuses;
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

/**
 * The app's own integration page, in a new tab: where its keys are issued or
 * its OAuth app is registered. The setup below takes what it gives.
 */
function IntegrateButton({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--brand-primary-faint)] p-3">
      <button
        type="button"
        onClick={() => void openIntegrationTab(url)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--brand-primary-strong)]"
      >
        Integrate {name}
        <ExternalLink className="h-4 w-4" />
      </button>
      <p className="min-w-0 flex-1 text-[12px] text-slate-600">
        Opens {name} in a new tab. Come back here to finish connecting.
      </p>
    </div>
  );
}

export function IntegrationPanel(props: {
  item: IntegrationDefinition;
  statuses: IntegrationStatuses;
  onChanged: () => void;
}) {
  const { item } = props;
  const appUrl =
    item.integrateUrl ??
    (item.flow.kind === "oauth" ? item.flow.preset?.developerUrl : undefined);
  return (
    <div className="space-y-4">
      {appUrl ? <IntegrateButton name={item.name} url={appUrl} /> : null}
      <IntegrationSetup {...props} />
    </div>
  );
}
