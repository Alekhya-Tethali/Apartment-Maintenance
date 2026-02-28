import type { ReminderData } from "./types";

/**
 * Format a WhatsApp / copy-paste reminder message for a defaulting flat.
 */
export function formatReminderMessage(
  flatNumber: string,
  amount: number,
  monthLabel: string,
  webappUrl: string | null,
): string {
  let msg = `Hi, this is a reminder that Flat ${flatNumber}'s maintenance of \u20B9${amount.toLocaleString("en-IN")} for ${monthLabel} is overdue. Please pay at the earliest.`;
  if (webappUrl) {
    msg += `\n\nPlease update your payment at: ${webappUrl}`;
  }
  msg += "\n\nThank you.";
  return msg;
}

/**
 * Human-readable relative date ("5m ago", "2d ago", etc.).
 */
export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Find the most recent reminder for a flat (reminders are ordered newest-first from API).
 */
export function getLatestReminder(
  reminders: ReminderData[],
  flatId: number,
): ReminderData | null {
  return reminders.find((r) => r.flatId === flatId) || null;
}
