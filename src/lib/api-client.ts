import type {
  FlatData,
  MonthData,
  PaymentData,
  ReminderData,
  PendingPayment,
  PendingCash,
  UpdateRequestData,
} from "./types";
import type { Role } from "./constants";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Base fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function apiFetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to load (${res.status})`);
  }
  return res.blob();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface SessionData {
  role: Role;
  flatId?: number;
  flatNumber?: string;
}

export const apiGetSession = () => apiFetch<SessionData>("/api/auth/me");

export const apiLogin = (body: {
  role: Role;
  flatNumber?: string;
  pin?: string;
  password?: string;
}) => apiFetch<{ error?: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) });

export const apiLogout = () => apiFetch<void>("/api/auth/logout", { method: "POST" });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface PublicConfig {
  security_name?: string;
  admin_name?: string;
}

export interface FullConfig extends PublicConfig {
  admin_whatsapp_number?: string;
  webapp_url?: string;
  [key: string]: string | undefined;
}

export const apiGetPublicConfig = () => apiFetch<PublicConfig>("/api/config/public");

export const apiGetConfig = () =>
  apiFetch<FullConfig & { configuredKeys?: string[] }>("/api/config");

export const apiUpdateConfig = (data: Record<string, string>) =>
  apiFetch<{ success: boolean }>("/api/config", { method: "PATCH", body: JSON.stringify(data) });

// ---------------------------------------------------------------------------
// Flats
// ---------------------------------------------------------------------------

export const apiGetFlats = () => apiFetch<FlatData[]>("/api/flats");

export const apiUpdateFlat = (data: {
  flatId: number;
  maintenanceAmount?: number;
  pin?: string;
  phone?: string;
  ownerName?: string;
  isRented?: boolean;
  tenantName?: string;
  tenantPhone?: string;
  amountScope?: string;
}) => apiFetch<{ success: boolean }>("/api/flats", { method: "PATCH", body: JSON.stringify(data) });

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

export const apiGetMonths = () => apiFetch<MonthData[]>("/api/months");

export const apiOpenMonth = (month: number, year: number) =>
  apiFetch<{ success: boolean }>("/api/months", { method: "POST", body: JSON.stringify({ month, year }) });

export const apiCloseMonth = (monthId: number) =>
  apiFetch<{ success: boolean }>("/api/months/close", { method: "POST", body: JSON.stringify({ monthId }) });

export const apiReopenMonth = (monthId: number) =>
  apiFetch<{ success: boolean }>("/api/months/reopen", { method: "POST", body: JSON.stringify({ monthId }) });

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const apiGetPayments = (params?: { monthId?: number; status?: string }) => {
  const sp = new URLSearchParams();
  if (params?.monthId) sp.set("monthId", String(params.monthId));
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  return apiFetch<PaymentData[]>(`/api/payments${qs ? `?${qs}` : ""}`);
};

export const apiGetPendingPayments = () =>
  apiFetch<PendingPayment[]>("/api/payments?status=pending_verification");

export const apiGetPendingCash = () =>
  apiFetch<PendingCash[]>("/api/payments?status=pending_collection");

export const apiSubmitPayment = (data: { monthId: number; paymentMode: string; paymentDate: string }) =>
  apiFetch<{ id: number }>("/api/payments", { method: "POST", body: JSON.stringify(data) });

export const apiApprovePayment = (paymentId: number) =>
  apiFetch<{ success: boolean }>("/api/payments/approve", { method: "POST", body: JSON.stringify({ paymentId }) });

export const apiRejectPayment = (paymentId: number, reason: string) =>
  apiFetch<{ success: boolean }>("/api/payments/reject", {
    method: "POST",
    body: JSON.stringify({ paymentId, reason }),
  });

export const apiCollectPayment = (paymentId: number) =>
  apiFetch<{ success: boolean }>("/api/payments/collect", { method: "POST", body: JSON.stringify({ paymentId }) });

export const apiConfirmCash = (paymentId: number) =>
  apiFetch<{ success: boolean }>("/api/payments/security-confirm", {
    method: "POST",
    body: JSON.stringify({ paymentId }),
  });

export const apiAdminUpdatePayment = (data: {
  paymentId: number;
  status?: string;
  adminNote?: string;
  amount?: number;
  paymentMode?: string;
  paymentDate?: string;
}) => apiFetch<{ success: boolean }>("/api/payments/admin-update", { method: "PATCH", body: JSON.stringify(data) });

export const apiAdminCreatePayment = (data: {
  flatId: number;
  monthId: number;
  amount: number;
  paymentMode: string;
  status: string;
  paymentDate: string;
  adminNote: string;
}) => apiFetch<{ success: boolean; id: number }>("/api/payments/admin-update", { method: "POST", body: JSON.stringify(data) });

export const apiDeletePayment = (paymentId: number) =>
  apiFetch<{ success: boolean }>("/api/payments/admin-update", {
    method: "DELETE",
    body: JSON.stringify({ paymentId }),
  });

export const apiUploadScreenshot = (paymentId: number, file: File) => {
  const formData = new FormData();
  formData.append("screenshot", file);
  formData.append("paymentId", String(paymentId));
  return apiFetch<{ success: boolean }>("/api/payments/upload-screenshot", {
    method: "POST",
    body: formData,
    headers: {}, // Let browser set content-type with boundary
  });
};

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

export const apiGetScreenshot = (paymentId: number) =>
  apiFetchBlob(`/api/screenshots?paymentId=${paymentId}`);

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const apiGetReminders = (monthId: number) =>
  apiFetch<ReminderData[]>(`/api/reminders?monthId=${monthId}`);

export const apiTrackReminder = (flatId: number, monthId: number) =>
  apiFetch<{ success: boolean }>("/api/reminders", {
    method: "POST",
    body: JSON.stringify({ flatId, monthId }),
  });

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export const apiGetRequests = () => apiFetch<UpdateRequestData[]>("/api/requests");

export const apiSubmitRequest = (data: { flatId: number; requestType: string; requestData: string }) =>
  apiFetch<{ success: boolean }>("/api/requests", { method: "POST", body: JSON.stringify(data) });

export const apiReviewRequest = (data: { requestId: number; action: "approve" | "reject"; adminNote?: string }) =>
  apiFetch<{ success: boolean }>("/api/requests/review", { method: "POST", body: JSON.stringify(data) });
