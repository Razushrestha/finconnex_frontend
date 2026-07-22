import type { Metadata } from "next";
import { WorkQueueView } from "@/components/work-queue/WorkQueueView";

export const metadata: Metadata = {
  title: "Work Queue — FinConnex",
  description: "My open activity, tasks, and workqueue views.",
};

export default function WorkQueuePage() {
  return <WorkQueueView />;
}
