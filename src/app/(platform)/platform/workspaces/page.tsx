import type { Metadata } from "next";
import { PlatformWorkspaces } from "@/components/platform/PlatformWorkspaces";

export const metadata: Metadata = {
  title: "Workspaces · Platform · FinConnex",
};

export default function PlatformWorkspacesPage() {
  return <PlatformWorkspaces />;
}
