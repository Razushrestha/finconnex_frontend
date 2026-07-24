import type { Metadata } from "next";
import { WorkQueueView } from "@/components/work-queue/WorkQueueView";

export const metadata: Metadata = {
  title: "Workqueue: FinConnex",
  description: "My open activity and prioritised workqueue.",
};

export default function WorkQueuePage() {
  return <WorkQueueView />;
}
