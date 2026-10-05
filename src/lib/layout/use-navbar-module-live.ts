"use client";

import { useEffect, useState } from "react";

type LiveKey =
  | "booking"
  | "documents"
  | "document-requests"
  | "signature"
  | "signature-templates"
  | "marketing"
  | "forms"
  | "linktree"
  | "smart-templates"
  | "support"
  | "time-tracking"
  | "portals"
  | "reports"
  | "resources"
  | "calculator"
  | "automations"
  | "settings"
  | "users";

function liveKey(pathname: string): LiveKey | null {
  if (pathname.startsWith("/booking")) return "booking";
  if (pathname.startsWith("/documents/requests")) return "document-requests";
  if (pathname.startsWith("/documents")) return "documents";
  if (pathname.startsWith("/signature/templates")) return "signature-templates";
  if (pathname.startsWith("/signature")) return "signature";
  if (pathname.startsWith("/smart-link/templates")) return "smart-templates";
  if (pathname.startsWith("/marketing/forms")) return "forms";
  if (pathname.startsWith("/marketing/linktree")) return "linktree";
  if (pathname.startsWith("/marketing")) return "marketing";
  if (pathname.startsWith("/support")) return "support";
  if (pathname.startsWith("/time-tracking")) return "time-tracking";
  if (pathname.startsWith("/portals")) return "portals";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/resources")) return "resources";
  if (pathname.startsWith("/calculator")) return "calculator";
  if (pathname.startsWith("/automations")) return "automations";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/users")) return "users";
  return null;
}

async function probeNavbarCrm(key: LiveKey): Promise<boolean> {
  try {
    if (key === "booking") {
      const { getCrmBookingSummary } = await import("@/lib/booking/api");
      await getCrmBookingSummary();
      return true;
    }
    if (key === "documents") {
      const { listCrmDocumentLibrary } = await import("@/lib/documents/library/api");
      await listCrmDocumentLibrary({ limit: 1 });
      return true;
    }
    if (key === "document-requests") {
      const { listCrmDocumentRequests } = await import("@/lib/documents/requests/api");
      await listCrmDocumentRequests({ limit: 1 });
      return true;
    }
    if (key === "signature") {
      const { listCrmSignatureRequests } = await import("@/lib/documents/signature/api");
      await listCrmSignatureRequests({ limit: 1 });
      return true;
    }
    if (key === "signature-templates") {
      const { listCrmSignatureTemplates } = await import(
        "@/lib/documents/signature/templates-api"
      );
      await listCrmSignatureTemplates();
      return true;
    }
    if (key === "forms") {
      const { listCrmForms } = await import("@/lib/forms/api");
      await listCrmForms({ limit: 1 });
      return true;
    }
    if (key === "linktree" || key === "smart-templates") {
      const { listCrmSmartHubs } = await import("@/lib/smart-links/api");
      await listCrmSmartHubs();
      return true;
    }
    if (key === "support") {
      const { listCrmTickets } = await import("@/lib/support/api");
      await listCrmTickets({ limit: 1 });
      return true;
    }
    if (key === "time-tracking") return true;
    if (key === "portals") {
      const { listCrmClientPortals } = await import("@/lib/portals/api");
      await listCrmClientPortals({ limit: 1, page: 1 });
      return true;
    }
    if (key === "reports") {
      const { listCrmReports } = await import("@/lib/reports/api");
      await listCrmReports();
      return true;
    }
    if (key === "resources") {
      const { listCrmResources } = await import("@/lib/resources/api");
      await listCrmResources({ limit: 1 });
      return true;
    }
    if (key === "calculator") {
      const { listCrmCalculations } = await import("@/lib/calculator/api");
      await listCrmCalculations({ limit: 1, page: 1 });
      return true;
    }
    if (key === "automations") {
      const { listAutomations } = await import("@/lib/automations/api");
      await listAutomations({ limit: 1 });
      return true;
    }
    if (key === "settings") {
      const { getCrmWorkspaceSettings } = await import("@/lib/settings/api");
      await getCrmWorkspaceSettings();
      return true;
    }
    if (key === "users") {
      const { listCrmWorkspaceMembers } = await import("@/lib/workspace-members/api");
      await listCrmWorkspaceMembers();
      return true;
    }
    const { listCrmCampaigns } = await import("@/lib/campaigns/api");
    await listCrmCampaigns({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

/** Green when that module's CRM call succeeds, red while loading or when it fails. */
export function useNavbarModuleLive(pathname: string): { show: boolean; live: boolean } {
  const key = liveKey(pathname);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!key) {
      setLive(false);
      return;
    }
    let cancelled = false;
    setLive(false);
    void probeNavbarCrm(key).then((ok) => {
      if (!cancelled) setLive(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { show: key !== null, live };
}
