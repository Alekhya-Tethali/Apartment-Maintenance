export const ROLES = {
  RESIDENT: "resident",
  SECURITY: "security",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PAYMENT_MODES = {
  GPAY: "gpay",
  PHONEPE: "phonepe",
  CASH: "cash",
} as const;

export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

export const PAYMENT_STATUS = {
  PENDING_VERIFICATION: "pending_verification",
  PENDING_SECURITY: "pending_security",
  PENDING_COLLECTION: "pending_collection",
  PAID: "paid",
  REJECTED: "rejected",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const MONTH_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type MonthStatus = (typeof MONTH_STATUS)[keyof typeof MONTH_STATUS];

// STATUS_COLORS moved to src/lib/theme.ts as STATUS_BADGE_COLORS (role-aware)

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: "Admin Pending",
  pending_security: "Security Pending",
  pending_collection: "Collect from Security",
  paid: "Completed",
  rejected: "Rejected",
};

// Longer labels for detail views / modals
export const STATUS_LABELS_LONG: Record<PaymentStatus, string> = {
  pending_verification: "Admin Approval Pending",
  pending_security: "Security Confirmation Pending",
  pending_collection: "Cash — Collect from Security",
  paid: "Payment Completed",
  rejected: "Rejected by Admin",
};

import { STATUS_BADGE_COLORS, getThemeStatusColor } from "./theme";

// Dynamic labels using security/admin names and viewer role
export function getStatusLabel(status: PaymentStatus, securityName?: string, role?: Role, adminName?: string): string {
  const secName = securityName || "Security";
  const admName = adminName || "Admin";

  if (status === "pending_verification") {
    if (role === "resident") return `${admName} Reviewing`;
    if (role === "admin") return "Verify Payment";
    return `${admName} Pending`;
  }
  if (status === "pending_security") {
    if (role === "security") return "Awaiting Confirmation";
    return `${secName} Pending`;
  }
  if (status === "pending_collection") {
    if (role === "resident") return `${secName} Confirmed`;
    if (role === "security") return `Handover to ${admName}`;
    return `Collect from ${secName}`;
  }
  if (status === "paid") {
    if (role === "admin") return "Collected";
    return "Completed";
  }
  return STATUS_LABELS[status];
}

export function getStatusLabelLong(status: PaymentStatus, securityName?: string, role?: Role, adminName?: string): string {
  const secName = securityName || "Security";
  const admName = adminName || "Admin";

  if (status === "pending_verification") {
    if (role === "resident") return `${admName} is Reviewing`;
    if (role === "admin") return "Verify This Payment";
    return `${admName}'s Approval Pending`;
  }
  if (status === "pending_security") {
    if (role === "security") return "Awaiting Your Confirmation";
    return `${secName}'s Confirmation Pending`;
  }
  if (status === "pending_collection") {
    if (role === "resident") return `${secName} Confirmed`;
    if (role === "security") return `Handover to ${admName}`;
    return `Cash — Collect from ${secName}`;
  }
  if (status === "paid") {
    if (role === "admin") return "Payment Collected";
    return "Payment Completed";
  }
  return STATUS_LABELS_LONG[status];
}

// Role-aware status colors (delegates to theme)
export function getStatusColor(status: PaymentStatus, role?: Role): string {
  return getThemeStatusColor(STATUS_BADGE_COLORS, status, role);
}

// FLAT_GRID_COLORS moved to src/lib/theme.ts as FLAT_GRID_TILE_COLORS (role-aware)

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  gpay: "GPay",
  phonepe: "PhonePe",
  cash: "Cash to Security",
};

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const JWT_EXPIRY = "7d";
export const DEFAULT_DUE_DATE_DAY = 10;

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
