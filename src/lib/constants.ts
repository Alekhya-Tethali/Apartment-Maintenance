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

export const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending_verification: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending_security: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pending_collection: "bg-orange-100 text-orange-800 border-orange-300",
  paid: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
};

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: "Pending Verification",
  pending_security: "Pending Security",
  pending_collection: "Collect from Security",
  paid: "Paid",
  rejected: "Rejected",
};

export const FLAT_GRID_COLORS: Record<string, string> = {
  paid: "bg-green-500 text-white",
  pending_verification: "bg-yellow-400 text-black",
  pending_security: "bg-yellow-400 text-black",
  pending_collection: "bg-orange-400 text-white",
  rejected: "bg-red-500 text-white",
  not_paid: "bg-red-600 text-white",
  overdue: "bg-red-700 text-white",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  gpay: "GPay",
  phonepe: "PhonePe",
  cash: "Cash to Security",
};

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const JWT_EXPIRY = "7d";
export const DEFAULT_DUE_DATE_DAY = 10;
