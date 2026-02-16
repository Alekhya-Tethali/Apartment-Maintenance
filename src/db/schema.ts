import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const flats = sqliteTable("flats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flatNumber: text("flat_number").notNull().unique(),
  maintenanceAmount: real("maintenance_amount").notNull().default(2000),
  pinHash: text("pin_hash").notNull(),
  phoneEncrypted: text("phone_encrypted"),
  phoneIv: text("phone_iv"),
  phoneTag: text("phone_tag"),
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
