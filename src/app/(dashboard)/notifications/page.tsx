import type { Metadata } from "next";
import { NotificationsCenterClient } from "@/components/notifications/NotificationsCenterClient";

export const metadata: Metadata = {
  title: "Notifications — FinConnex",
  description: "Notification center for tasks, deals, leads, and system alerts.",
};

export default function NotificationsPage() {
  return <NotificationsCenterClient />;
}
