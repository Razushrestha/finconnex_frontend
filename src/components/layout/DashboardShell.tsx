"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { BottomBar } from "@/components/layout/BottomBar";
import type { SessionPayload } from "@/lib/auth/types";
import { setRulesActor } from "@/lib/rules/actor";
import { BOTTOM_BAR_H } from "@/lib/layout";

interface DashboardShellProps {
  children: React.ReactNode;
  session: SessionPayload;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRulesActor({
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    });
  }, [session.userId, session.name, session.email, session.role]);

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
      className="flex h-screen w-full max-w-full overflow-hidden overscroll-none bg-background font-sans"
    >
      {/* On mobile the sidebar renders as a fixed off-canvas drawer (out of
          document flow), so this wrapper takes up no space there: width
          only matters at md+, where the sidebar is back in normal flow. */}
      <div className="relative z-20 shrink-0">
        <Sidebar
          collapsed={collapsed}
          tenantName={session.tenantName}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
      </div>
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <Navbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          user={{
            name: session.name,
            role: session.role,
            email: session.email,
            tenantName: session.tenantName,
          }}
        />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          {children}
        </main>
        <div className={`${BOTTOM_BAR_H} shrink-0`} aria-hidden />
      </div>
      <BottomBar />
    </div>
  );
}
