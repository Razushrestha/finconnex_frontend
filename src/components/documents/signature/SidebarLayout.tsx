// @/components/documents/signature/SidebarLayout.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Files, LayoutTemplate } from "lucide-react";

const items = [
  {
    label: "Overview",
    href: "/documents/signature",
    icon: LayoutDashboard,
  },
  { label: "Documents", href: "/documents/signature/documents", icon: Files },
  {
    label: "Templates",
    href: "/documents/signature/templates",
    icon: LayoutTemplate,
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed: collapsedProp }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  useEffect(() => {
    if (collapsedProp !== undefined) return;

    const checkMainSidebar = () => {
      const mainAside = document.querySelector("aside");
      if (mainAside) {
        setInternalCollapsed(mainAside.classList.contains("md:w-[72px]"));
      }
    };

    checkMainSidebar();
    const observer = new MutationObserver(checkMainSidebar);
    const mainAside = document.querySelector("aside");
    if (mainAside) {
      observer.observe(mainAside, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    window.addEventListener("resize", checkMainSidebar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkMainSidebar);
    };
  }, [collapsedProp]);

  const isCollapsed = collapsedProp ?? internalCollapsed;

  return (
    <aside
      className={`fixed top-16 bottom-0 z-10 w-56 shrink-0 overflow-y-auto border-r border-border bg-background px-3 py-4 transition-all duration-200 ${
        isCollapsed ? "left-[72px]" : "left-64"
      }`}
    >
      <nav className="flex flex-col gap-1">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
