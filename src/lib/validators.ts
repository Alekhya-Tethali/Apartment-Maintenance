import { z } from "zod";

export const loginSchema = z.object({
  role: z.enum(["resident", "security", "admin"]),
  flatNumber: z.string().optional(),
  pin: z.string().min(4).max(4).optional(),
  password: z.string().min(6).optional(),
});

export const submitPaymentSchema = z.object({
  monthId: z.number().int().positive(),
  paymentMode: z.enum(["gpay", "phonepe", "upi_other", "cash"]),
  paymentDate: z.string().optional(),
  skipScreenshot: z.boolean().optional(),
});

export const rejectPaymentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const updateFlatSchema = z.object({
  maintenanceAmount: z.number().positive().optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  phone: z.string().min(10).max(15).optional(),
  ownerName: z.string().max(100).optional(),
  isRented: z.boolean().optional(),
  tenantName: z.string().max(100).optional(),
  tenantPhone: z.string().min(10).max(15).optional(),
});

export const createRequestSchema = z.object({
  flatId: z.number().int().positive(),
  requestType: z.enum(["tenant_info", "amount"]),
  requestData: z.string().min(2).max(2000),
});

export const reviewRequestSchema = z.object({
  requestId: z.number().int().positive(),
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().max(500).optional(),
});

export const openMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
});

export const updateConfigSchema = z.object({
  dueDateDay: z.number().int().min(1).max(28).optional(),
  securityPin: z.string().length(4).regex(/^\d{4}$/).optional(),
  adminPassword: z.string().min(6).optional(),
  telegramBotToken: z.string().optional(),
  telegramAdminChatId: z.string().optional(),
  telegramSecurityChatId: z.string().optional(),
  adminWhatsappNumber: z.string().optional(),
  webappUrl: z.string().optional(),
  securityName: z.string().optional(),
  adminName: z.string().optional(),
  backupEmail: z.string().email().optional(),
  backupEmailPassword: z.string().optional(),
});
