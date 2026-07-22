import React from "react";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { SettingsTopNav } from "@/components/settings/settings-top-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/50 pb-12">
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center text-sm text-muted-foreground"
        >
          <Link href="/" className="flex items-center hover:text-foreground">
            <Home className="w-3.5 h-3.5 mr-1" />
          </Link>
          <ChevronRight className="w-3.5 h-3.5 mx-2 text-muted-foreground" />
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
        </nav>
      </div>

      {/* Horizontal Top Navigation Bar */}
      <SettingsTopNav />

      {/* Main Content Workspace Layout */}
      <div className="max-w-7xl mx-auto px-6 pt-6">{children}</div>
    </div>
  );
}
