import CryptoJS from "crypto-js";

export interface BackupReminderConfig {
  enabled: boolean;
  time?: string; // Optional legacy "HH:mm"
  lastPromptDate?: string; // "YYYY-MM-DD" for daily first-open sheet
  lastNotifiedDate?: string; // "YYYY-MM-DD" for notifications
}

const DEFAULT_CONFIG: BackupReminderConfig = {
  enabled: false,
};

const CONFIG_KEY = "finance_backup_reminder_config";
const ENC_KEY_STORAGE = "finance_backup_reminder_enc_key";
const SALT_STORAGE = "finance_backup_reminder_salt";
export const BACKUP_CHANNEL_NAME = "finaura_backup_channel";
export const NOTIFICATION_TAG = "finaura-daily-backup";

function getDeviceSalt(): string {
  let salt = localStorage.getItem(SALT_STORAGE);
  if (!salt) {
    salt = typeof crypto !== "undefined" && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SALT_STORAGE, salt);
  }
  return salt;
}

export function loadBackupReminderConfig(): BackupReminderConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      time: parsed.time,
      lastPromptDate: parsed.lastPromptDate || parsed.lastNotifiedDate,
      lastNotifiedDate: parsed.lastNotifiedDate,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveBackupReminderConfig(config: BackupReminderConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function saveBackupReminderKey(pin: string): void {
  const secret = getDeviceSalt() + "_finaura_device_reminder";
  const cipher = CryptoJS.AES.encrypt(pin, secret).toString();
  localStorage.setItem(ENC_KEY_STORAGE, cipher);
}

export function loadBackupReminderKey(): string | null {
  const cipher = localStorage.getItem(ENC_KEY_STORAGE);
  if (!cipher) return null;
  try {
    const secret = getDeviceSalt() + "_finaura_device_reminder";
    const bytes = CryptoJS.AES.decrypt(cipher, secret);
    const pin = bytes.toString(CryptoJS.enc.Utf8);
    return pin || null;
  } catch {
    return null;
  }
}

export function clearBackupReminderKey(): void {
  localStorage.removeItem(ENC_KEY_STORAGE);
}

export function isBackupReminderEnabled(): boolean {
  return loadBackupReminderConfig().enabled;
}

export function setBackupReminderEnabled(enabled: boolean): void {
  const config = loadBackupReminderConfig();
  config.enabled = enabled;
  saveBackupReminderConfig(config);
}

/**
 * Check if the user should see the "Create a backup now" bottom sheet today.
 * Triggers once per calendar day when the backup reminder toggle is enabled.
 */
export function shouldShowDailyBackupPrompt(): boolean {
  const config = loadBackupReminderConfig();
  if (!config.enabled) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  return config.lastPromptDate !== todayStr;
}

/**
 * Mark that the daily backup prompt was presented to the user today.
 */
export function markDailyBackupPromptShown(): void {
  const config = loadBackupReminderConfig();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  config.lastPromptDate = `${year}-${month}-${day}`;
  saveBackupReminderConfig(config);
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function sendBackupNotification(isTest: boolean = false): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return false;
    }
  }

  const title = isTest 
    ? "FinAura Backup Reminder (Test)" 
    : "FinAura Daily Backup Reminder";
  
  const body = isTest
    ? "Test successful! Tap this notification to launch FinAura and automatically back up your vault."
    : "It's time for your daily vault backup! Tap to secure and export your data now.";

  const targetUrl = new URL("/?action=daily_backup&t=" + Date.now(), window.location.origin).href;
  const baseUrl = import.meta.env.BASE_URL || "/";
  const iconUrl = new URL(`${baseUrl}icon-192.png`.replace(/\/\//g, "/"), window.location.origin).href;

  const options: NotificationOptions = {
    body,
    icon: iconUrl,
    badge: iconUrl,
    tag: NOTIFICATION_TAG,
    requireInteraction: true,
    data: {
      action: "daily_backup",
      url: targetUrl,
      timestamp: Date.now(),
    },
  };

  // Try service worker registration first (best for system notification panel & PWA)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (e) {
      console.warn("ServiceWorker notification failed, falling back to window Notification", e);
    }
  }

  // Fallback to standard window Notification
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (typeof window !== "undefined") {
        window.location.href = targetUrl;
      }
    };
    return true;
  } catch (e) {
    console.error("Failed to show notification", e);
    return false;
  }
}

export async function checkAndTriggerReminder(): Promise<boolean> {
  const config = loadBackupReminderConfig();
  if (!config.enabled) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  // If already notified today, do not notify again today
  if (config.lastNotifiedDate === todayStr) {
    return false;
  }

  // If a time was specified, check time; otherwise trigger
  if (config.time) {
    const [targetH, targetM] = config.time.split(":").map(Number);
    if (!isNaN(targetH) && !isNaN(targetM)) {
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const isTimeOrPast = currentH > targetH || (currentH === targetH && currentM >= targetM);
      if (!isTimeOrPast) {
        return false;
      }
    }
  }

  // Mark as notified today so it won't fire repeatedly
  config.lastNotifiedDate = todayStr;
  saveBackupReminderConfig(config);

  return sendBackupNotification(false);
}
