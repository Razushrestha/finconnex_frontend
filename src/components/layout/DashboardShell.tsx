"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import type { SessionPayload } from "@/lib/auth/types";

interface DashboardShellProps {
  children: React.ReactNode;
  session: SessionPayload;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans dark:bg-black">
      {/* On mobile the sidebar renders as a fixed off-canvas drawer (out of
          document flow), so this wrapper takes up no space there — width
          only matters at md+, where the sidebar is back in normal flow. */}
      <div className="shrink-0">
        <Sidebar
          collapsed={collapsed}
          tenantName={session.tenantName}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Navbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onOpenMobileMenu={() => setMobileOpen(true)}
          user={{
            name: session.name,
            role: session.role,
            email: session.email,
            tenantName: session.tenantName,
          }}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
