import type { Metadata } from "next";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationList />;
}
