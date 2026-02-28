import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const flats = sqliteTable("flats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flatNumber: text("flat_number").notNull().unique(),
  maintenanceAmount: real("maintenance_amount").notNull().default(2000),
  pinHash: text("pin_hash").notNull(),
  ownerPhoneEncrypted: text("owner_phone_encrypted"),
  ownerPhoneIv: text("owner_phone_iv"),
  ownerPhoneTag: text("owner_phone_tag"),
  ownerName: text("owner_name"),
  isRented: integer("is_rented").notNull().default(0),
  tenantName: text("tenant_name"),
  tenantPhoneEncrypted: text("tenant_phone_encrypted"),
  tenantPhoneIv: text("tenant_phone_iv"),
  tenantPhoneTag: text("tenant_phone_tag"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const months = sqliteTable(
  "months",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    status: text("status").notNull().default("open"),
    dueDateDay: integer("due_date_day").notNull().default(10),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    closedAt: text("closed_at"),
  },
  (table) => [uniqueIndex("month_year_idx").on(table.month, table.year)]
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    flatId: integer("flat_id")
      .notNull()
      .references(() => flats.id),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id),
    amount: real("amount").notNull(),
    paymentMode: text("payment_mode").notNull(),
    status: text("status").notNull().default("pending_verification"),
    screenshotBlobUrl: text("screenshot_blob_url"),
    screenshotIv: text("screenshot_iv"),
    screenshotTag: text("screenshot_tag"),
    paymentDate: text("payment_date"),
    submittedAt: text("submitted_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    securityConfirmedAt: text("security_confirmed_at"),
    verifiedAt: text("verified_at"),
    collectedAt: text("collected_at"),
    adminNote: text("admin_note"),
  },
  (table) => [uniqueIndex("flat_month_idx").on(table.flatId, table.monthId)]
);

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flatId: integer("flat_id")
    .notNull()
    .references(() => flats.id),
  monthId: integer("month_id")
    .notNull()
    .references(() => months.id),
  sentBy: text("sent_by").notNull(),
  sentAt: text("sent_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const amountOverrides = sqliteTable(
  "amount_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    flatId: integer("flat_id")
      .notNull()
      .references(() => flats.id),
    monthId: integer("month_id")
      .notNull()
      .references(() => months.id),
    amount: real("amount").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("flat_month_override_idx").on(table.flatId, table.monthId)]
);

export const updateRequests = sqliteTable("update_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flatId: integer("flat_id")
    .notNull()
    .references(() => flats.id),
  requestType: text("request_type").notNull(),
  requestData: text("request_data").notNull(),
  status: text("status").notNull().default("pending"),
  requestedBy: text("requested_by").notNull(),
  requestedAt: text("requested_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  reviewedAt: text("reviewed_at"),
  adminNote: text("admin_note"),
});

export const config = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  identifier: text("identifier").notNull(),
  attemptedAt: text("attempted_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  success: integer("success").notNull().default(0),
});
