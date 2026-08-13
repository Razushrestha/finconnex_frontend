// @/app/documents/signature/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/documents/signature/SidebarLayout";

export default function SignatureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);

  useEffect(() => {
    const checkSidebarState = () => {
      const mainAside = document.querySelector("aside");
      if (mainAside) {
        setIsMainCollapsed(mainAside.classList.contains("md:w-[72px]"));
      }
    };

    checkSidebarState();
    const observer = new MutationObserver(checkSidebarState);
    const mainAside = document.querySelector("aside");
    if (mainAside) {
      observer.observe(mainAside, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    window.addEventListener("resize", checkSidebarState);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkSidebarState);
    };
  }, []);

  return (
    <div className="flex min-h-full w-full bg-slate-50 dark:bg-zinc-950">
      <Sidebar collapsed={isMainCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-200 ml-56">
        {children}
      </div>
    </div>
  );
}
