// Centralized theme tokens — single source of truth for all colors.
// Every component and page imports from here. No hardcoded Tailwind color classes elsewhere.

// ─── Navigation Bar ───
export const NAV_BAR = {
  bg: "bg-indigo-700",
  hoverBg: "hover:bg-indigo-600",
  logoutBg: "bg-indigo-600",
  logoutHover: "hover:bg-indigo-500",
  subtitleText: "text-indigo-200",
} as const;

// ─── Button Variants ───
export const BUTTON_VARIANTS = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
  secondary: "bg-slate-600 text-white hover:bg-slate-700 active:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  outline: "bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50 active:bg-slate-100",
} as const;

// ─── Toast ───
export const TOAST_STYLES = {
  success: "bg-emerald-600 text-white",
  error: "bg-rose-600 text-white",
  info: "bg-indigo-600 text-white",
} as const;

// ─── Loading Spinner ───
export const SPINNER = {
  color: "border-indigo-600",
} as const;

// ─── Login Page ───
export const LOGIN = {
  gradient: "bg-gradient-to-b from-indigo-600 to-indigo-800",
  iconBg: "bg-indigo-100",
  iconColor: "text-indigo-600",
  activeTab: "text-indigo-600",
  selectedFlat: "border-indigo-500 bg-indigo-50",
  selectedFlatText: "text-indigo-700",
  focusBorder: "focus:border-indigo-500 focus:ring-indigo-200",
  loadingText: "text-indigo-600",
  linkText: "text-indigo-600",
  dropdownSelected: "bg-indigo-600 text-white",
  dropdownHover: "hover:bg-indigo-50 hover:text-indigo-700",
} as const;

// ─── Month Selector ───
export const MONTH_SELECTOR = {
  selectedBg: "bg-indigo-600 text-white",
  hoverMonth: "hover:bg-indigo-50 hover:text-indigo-700",
  closedMonth: "bg-slate-100 text-slate-500 hover:bg-slate-200",
  openMonth: "bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700",
  closedLabel: "text-emerald-600",
} as const;

// ─── Page Layout ───
export const PAGE = {
  bg: "bg-slate-50",
} as const;

// ─── Status Badge Colors (role-aware) ───
export const STATUS_BADGE_COLORS: Record<string, Record<string, string>> = {
  pending_verification: { default: "bg-amber-100 text-amber-800 border-amber-300" },
  pending_security:     { default: "bg-amber-100 text-amber-800 border-amber-300" },
  pending_collection:   {
    default:  "bg-orange-100 text-orange-800 border-orange-300",
    resident: "bg-emerald-100 text-emerald-800 border-emerald-300",
    security: "bg-teal-100 text-teal-700 border-teal-300",
  },
  paid:     { default: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  rejected: { default: "bg-rose-100 text-rose-800 border-rose-300" },
};

// ─── Flat Grid Tile Colors (role-aware) ───
export const FLAT_GRID_TILE_COLORS: Record<string, Record<string, string>> = {
  paid:                 { default: "bg-emerald-500 text-white" },
  pending_verification: { default: "bg-amber-400 text-black" },
  pending_security:     { default: "bg-amber-400 text-black" },
  pending_collection:   {
    default:  "bg-orange-400 text-white",
    resident: "bg-emerald-400 text-white",
    security: "bg-teal-400 text-white",
  },
  rejected:  { default: "bg-rose-500 text-white" },
  not_paid:  { default: "bg-rose-600 text-white" },
  overdue:   { default: "bg-rose-700 text-white" },
};

// Helper: get color for status + role, falls back to default
export function getThemeStatusColor(
  map: Record<string, Record<string, string>>,
  status: string,
  role?: string
): string {
  const entry = map[status];
  if (!entry) return "";
  if (role && entry[role]) return entry[role];
  return entry.default || "";
}

// ─── Admin Dashboard Stats ───
export const ADMIN_STATS = {
  paid:            { bg: "bg-emerald-50", text: "text-emerald-700", sub: "text-emerald-600" },
  collected:       { bg: "bg-indigo-50",  text: "text-indigo-700",  sub: "text-indigo-600" },
  toVerify:        { bg: "bg-amber-50",   text: "text-amber-700",   sub: "text-amber-600" },
  cash:            { bg: "bg-orange-50",  text: "text-orange-700",  sub: "text-orange-600" },
  expected:        { bg: "bg-slate-100",  text: "text-slate-700",   sub: "text-slate-500" },
  defaulter:       { bg: "bg-rose-50",    text: "text-rose-700",    sub: "text-rose-600" },
} as const;

// ─── Misc Shared Colors ───
export const COLORS = {
  // Info boxes
  infoBg: "bg-indigo-50",
  infoText: "text-indigo-700",
  // Error/danger info boxes
  dangerBg: "bg-rose-50",
  dangerText: "text-rose-700",
  // Warning boxes
  warningBg: "bg-amber-50",
  warningText: "text-amber-800",
  // Success
  successText: "text-emerald-600",
  // Overdue/late
  overdueText: "text-rose-600",
  lateText: "text-amber-600",
  // Progress bar
  progressBg: "bg-slate-200",
  progressFill: "bg-emerald-500",
  // Settings active tab
  activeTab: "bg-white text-indigo-600 shadow-sm",
  inactiveTab: "text-slate-500",
  // Selected card
  selectedCard: "bg-indigo-50 border-indigo-500",
  // Phone set indicator
  phoneSet: "text-emerald-600",
  // Year selector
  yearSelected: "bg-indigo-600 text-white",
  yearUnselected: "bg-white text-slate-600 border border-slate-200",
} as const;

// ─── Progress Color Thresholds ───
export function getProgressColor(ratio: number): string {
  if (ratio >= 1) return "bg-emerald-500";
  if (ratio >= 0.75) return "bg-emerald-400";
  if (ratio >= 0.5) return "bg-amber-400";
  if (ratio >= 0.25) return "bg-orange-400";
  return "bg-rose-400";
}

// ─── Payment Mode Card Colors (submit page) ───
export const PAYMENT_MODE_COLORS = {
  gpay: "bg-indigo-50 border-indigo-200",
  phonepe: "bg-violet-50 border-violet-200",
  cash: "bg-emerald-50 border-emerald-200",
} as const;
