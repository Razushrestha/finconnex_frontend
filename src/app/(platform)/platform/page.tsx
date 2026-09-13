import type { Metadata } from "next";
import { PlatformHome } from "@/components/platform/PlatformHome";

export const metadata: Metadata = {
  title: "Platform console · FinConnex",
};

export default function PlatformPage() {
  return <PlatformHome />;
}
