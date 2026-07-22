import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = {
  title: "Resources — FinConnex",
  description: "Knowledge base and training resources.",
};

export default function ResourcesPage() {
  return (
    <ComingSoonPage
      title="Resources"
      section="§16"
      description="Knowledge base, training packs, and shared resources are next. This screen is reserved so navigation stays wired."
    />
  );
}
