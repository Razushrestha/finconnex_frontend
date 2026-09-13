"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { BottomBar } from "@/components/layout/BottomBar";
import { CrmTokenKeepAlive } from "@/components/layout/CrmTokenKeepAlive";
import type { SessionPayload } from "@/lib/auth/types";
import { setRulesActor } from "@/lib/rules/actor";
import { isPlatformAdminRole } from "@/lib/auth/platform";
import { rulesRoleForWorkspaceRole } from "@/lib/auth/workspace-role";
import { BOTTOM_BAR_H } from "@/lib/layout";
import { SettingsCrmProvider, useCrmSettings } from "@/lib/settings/use-crm-settings";
import {
  resolveWorkspaceBrand,
  workspaceBrandCssVars,
} from "@/lib/settings/brand";
import { getTenantContext, setTenantContext } from "@/lib/persistence/tenant";

interface DashboardShellProps {
  children: React.ReactNode;
  session: SessionPayload;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  return (
    <SettingsCrmProvider>
      <DashboardShellInner session={session}>{children}</DashboardShellInner>
    </SettingsCrmProvider>
  );
}

function DashboardShellInner({ children, session }: DashboardShellProps) {
  if (
    session.tenantId &&
    getTenantContext().tenantId !== session.tenantId
  ) {
    setTenantContext({ tenantId: session.tenantId });
  }
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const crm = useCrmSettings();
  const brand = useMemo(
    () =>
      resolveWorkspaceBrand({
        ...crm.settings,
        primaryColor:
          crm.previewBrand?.primaryColor ?? crm.settings?.primaryColor,
        secondaryColor:
          crm.previewBrand?.secondaryColor ?? crm.settings?.secondaryColor,
      }),
    [crm.settings, crm.previewBrand],
  );

  useEffect(() => {
    /*
     * The permission engine must be told the role held *in this workspace*.
     * `session.role` is User.globalRole — the platform staff tier, USER for
     * everyone who signs up — so passing it gated a workspace owner as a
     * plain user and requireAction refused sales.contacts.create and the
     * rest. Platform staff keep their own tier; everyone else is judged by
     * their membership, exactly as the Nest guards judge them.
     */
    const role = isPlatformAdminRole(session.role)
      ? "System Admin"
      : (rulesRoleForWorkspaceRole(session.workspaceRole) ?? session.role);
    setRulesActor({
      id: session.userId,
      name: session.name,
      email: session.email,
      role,
    });
  }, [
    session.userId,
    session.name,
    session.email,
    session.role,
    session.workspaceRole,
  ]);

  // Focus/scrollIntoView on overlays can shift this overflow-hidden shell and
  // slide the left nav off-screen. Keep the chrome pinned.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const lock = () => {
      if (el.scrollLeft !== 0 || el.scrollTop !== 0) el.scrollTo(0, 0);
    };
    el.addEventListener("scroll", lock);
    return () => el.removeEventListener("scroll", lock);
  }, []);

  return (
    <div
      ref={shellRef}
      style={workspaceBrandCssVars(brand)}
      className="flex h-screen w-full max-w-full overflow-hidden overscroll-none bg-background font-sans"
    >
      {/* On mobile the sidebar renders as a fixed off-canvas drawer (out of
          document flow), so this wrapper takes up no space there: width
          only matters at md+, where the sidebar is back in normal flow. */}
      <div className="relative z-20 shrink-0">
        <Suspense
          fallback={
            <aside className="hidden h-screen w-64 shrink-0 md:block" />
          }
        >
          <Sidebar
            collapsed={collapsed}
            tenantName={session.tenantName}
            mobileOpen={mobileOpen}
            onMobileOpenChange={setMobileOpen}
            onToggleSidebar={() => setCollapsed((c) => !c)}
          />
        </Suspense>
      </div>
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-16 shrink-0 border-b border-border/60" />}>
          <Navbar
            onOpenMobileMenu={() => setMobileOpen(true)}
            user={{
              name: session.name,
              role: session.role,
              workspaceRole: session.workspaceRole,
              email: session.email,
              tenantName: session.tenantName,
            }}
          />
        </Suspense>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          {children}
        </main>
        <div className={`${BOTTOM_BAR_H} shrink-0`} aria-hidden />
      </div>
      <BottomBar />
      <CrmTokenKeepAlive />
    </div>
  );
}
