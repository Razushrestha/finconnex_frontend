export type NotificationDigest = "realtime" | "daily" | "weekly" | "off";

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailMentions: boolean;
  inAppMentions: boolean;
  taskAssigned: boolean;
  digest: NotificationDigest;
  fcmToken: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  emailMentions: true,
  inAppMentions: true,
  taskAssigned: true,
  digest: "daily",
  fcmToken: "",
};
