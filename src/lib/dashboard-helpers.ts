import type { FlatStatus, FlatData, PaymentData, MonthData, ReminderData } from "./types";
import type { PaymentStatus } from "./constants";

/**
 * Build the flat grid data for a given month, mapping each flat to its payment status.
 * Used by both admin and security dashboards.
 */
export function buildFlatGrid(
  allFlats: FlatData[],
  monthPayments: PaymentData[],
  reminders: ReminderData[],
  selectedMonth: MonthData | null,
): FlatStatus[] {
  return allFlats.map((flat) => {
    const payment = monthPayments.find((p) => p.flatId === flat.id);
    const isOverdue = selectedMonth
      ? selectedMonth.status === "open" && new Date().getDate() > selectedMonth.dueDateDay
      : false;
    const lastReminder = reminders.find((r) => r.flatId === flat.id);

    return {
      flatNumber: flat.flatNumber,
      flatId: flat.id,
      amount: flat.maintenanceAmount,
      status: payment
        ? (payment.status as PaymentStatus)
        : isOverdue
          ? ("overdue" as const)
          : ("not_paid" as const),
      paymentId: payment?.id,
      lastRemindedAt: lastReminder?.sentAt || null,
      ownerName: flat.ownerName || null,
      tenantName: flat.tenantName || null,
      isRented: flat.isRented,
    };
  });
}

export interface MonthStats {
  paidCount: number;
  pendingVerify: number;
  pendingCollect: number;
  totalCollected: number;
  cashToCollect: number;
  totalExpected: number;
  defaulterCount: number;
  defaulterAmount: number;
}

/**
 * Compute aggregate stats for a given month's payments. Used by admin dashboard.
 */
export function computeMonthStats(
  monthPayments: PaymentData[],
  allFlats: FlatData[],
): MonthStats {
  const paidCount = monthPayments.filter((p) => p.status === "paid").length;
  const pendingVerify = monthPayments.filter((p) => p.status === "pending_verification").length;
  const pendingCollect = monthPayments.filter((p) => p.status === "pending_collection").length;
  const totalCollected = monthPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const cashToCollect = monthPayments
    .filter((p) => p.status === "pending_collection")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = allFlats.reduce((sum, f) => sum + f.maintenanceAmount, 0);
  const nonRejected = monthPayments.filter((p) => p.status !== "rejected");
  const defaulterCount = allFlats.length - nonRejected.length;
  const defaulterAmount = allFlats
    .filter((flat) => !monthPayments.find((p) => p.flatId === flat.id && p.status !== "rejected"))
    .reduce((sum, f) => sum + f.maintenanceAmount, 0);

  return {
    paidCount,
    pendingVerify,
    pendingCollect,
    totalCollected,
    cashToCollect,
    totalExpected,
    defaulterCount,
    defaulterAmount,
  };
}

/**
 * Compute stats shown on the security dashboard.
 */
export function computeSecurityStats(gridData: FlatStatus[], monthPayments: PaymentData[]) {
  const paidCount = gridData.filter(
    (f) =>
      f.status === "paid" ||
      f.status === "pending_collection" ||
      f.status === "pending_verification",
  ).length;

  const pendingSecurityPayments = monthPayments.filter(
    (p) => p.status === "pending_security",
  );

  return { paidCount, pendingSecurityPayments };
}
