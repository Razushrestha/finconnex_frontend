// "use client";

// import { useState } from "react";
// import Sidebar from "@/components/layout/Sidebar";
// import Navbar from "@/components/layout/Navbar";
// import type { SessionPayload } from "@/lib/auth/types";

// interface DashboardShellProps {
//   children: React.ReactNode;
//   session: SessionPayload;
// }

// export function DashboardShell({ children, session }: DashboardShellProps) {
//   const [collapsed, setCollapsed] = useState(false);

//   return (
//     <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black">
//       <Sidebar collapsed={collapsed} tenantName={session.tenantName} />
//       <div className="flex flex-1 flex-col">
//         <Navbar
//           collapsed={collapsed}
//           onToggleSidebar={() => setCollapsed((c) => !c)}
//           user={{
//             name: session.name,
//             role: session.role,
//             email: session.email,
//             tenantName: session.tenantName,
//           }}
//         />
//         {children}
//       </div>
//     </div>
//   );
// }

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans dark:bg-black">
      <div className="shrink-0">
        <Sidebar collapsed={collapsed} tenantName={session.tenantName} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Navbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
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
