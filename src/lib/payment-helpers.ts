import type { PaymentData } from "./types";

/**
 * Returns a string describing how late a payment was submitted, or null if on time.
 */
export function getLateInfo(payment: PaymentData): string | null {
  if (!payment.dueDateDay) return null;

  const dueDate = new Date(payment.year, payment.month - 1, payment.dueDateDay);
  const submittedDate = new Date(payment.submittedAt);

  if (submittedDate <= dueDate) return null;

  const diffDays = Math.ceil(
    (submittedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return null;
  return `Submitted ${diffDays} day${diffDays > 1 ? "s" : ""} after due date`;
}

/**
 * Whether a resident can still edit/resubmit this payment.
 */
export function isEditable(payment: PaymentData): boolean {
  if (payment.monthStatus === "closed") return false;
  if (payment.status === "paid") return false;
  if (payment.status === "pending_collection") return false;
  return true;
}
