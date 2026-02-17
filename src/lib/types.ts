import type { PaymentStatus, PaymentMode } from "./constants";

export interface FlatStatus {
  flatNumber: string;
  flatId: number;
  amount: number;
  status: PaymentStatus | "not_paid" | "overdue";
  paymentId?: number;
  lastRemindedAt?: string | null;
}

export interface MonthData {
  id: number;
  month: number;
  year: number;
  status: string;
  dueDateDay: number;
  closedAt?: string | null;
}

export interface PaymentData {
  id: number;
  flatId: number;
  flatNumber: string;
  monthId: number;
  month: number;
  year: number;
  monthStatus?: string;
  dueDateDay?: number;
  amount: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  submittedAt: string;
  paymentDate?: string;
  adminNote?: string | null;
  hasScreenshot?: boolean;
  securityConfirmedAt?: string;
  verifiedAt?: string;
  collectedAt?: string;
}

export interface FlatData {
  id: number;
  flatNumber: string;
  maintenanceAmount: number;
  hasPhone?: boolean;
  phone?: string;
}

export interface ReminderData {
  id: number;
  flatId: number;
  flatNumber: string;
  monthId: number;
  sentBy: string;
  sentAt: string;
}

export interface PendingPayment {
  id: number;
  flatNumber: string;
  amount: number;
  paymentMode: PaymentMode;
  submittedAt: string;
  hasScreenshot: boolean;
  month: number;
  year: number;
}

export interface PendingCash {
  id: number;
  flatNumber: string;
  amount: number;
  submittedAt: string;
  securityConfirmedAt: string;
  month: number;
  year: number;
}

export type ToastState = { message: string; type: "success" | "error" } | null;

export function formatPaymentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Find the best default month to display:
 * 1. Open month matching current calendar month/year
 * 2. Most recent open month (closest to now)
 * 3. Most recent month overall
 */
export function findCurrentMonth(months: MonthData[]): MonthData | null {
  if (months.length === 0) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  // Prefer the open month matching current calendar month
  const currentCalendarMonth = months.find(
    (m) => m.status === "open" && m.year === currentYear && m.month === currentMonthNum
  );
  if (currentCalendarMonth) return currentCalendarMonth;

  // Fall back to most recent open month
  const openMonths = [...months]
    .filter((m) => m.status === "open")
    .sort((a, b) => b.year - a.year || b.month - a.month);
  if (openMonths.length > 0) return openMonths[0];

  // Fall back to most recent month overall
  const sorted = [...months].sort((a, b) => b.year - a.year || b.month - a.month);
  return sorted[0];
}
