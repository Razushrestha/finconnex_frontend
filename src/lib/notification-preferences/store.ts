import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/notification-preferences/types";
import { createBoardStore } from "@/lib/rules/module-store";

function clonePrefs(row: NotificationPreferences): NotificationPreferences {
  return { ...row };
}

const store = createBoardStore({
  key: "settings:notification-preferences:v1",
  seed: () => clonePrefs(DEFAULT_NOTIFICATION_PREFERENCES),
});

export function loadNotificationPreferences(): NotificationPreferences {
  return clonePrefs(store.list());
}

export function saveNotificationPreferences(
  row: NotificationPreferences,
): NotificationPreferences {
  const next = clonePrefs(row);
  store.save(next);
  return next;
}

export function replaceCrmNotificationPreferences(
  remote: NotificationPreferences,
) {
  store.save(clonePrefs(remote));
}
