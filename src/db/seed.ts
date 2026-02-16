import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { flats, months, config } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  console.log("Seeding database...");

  // Default PIN: 0000 for all flats
  const defaultPinHash = await bcrypt.hash("0000", 12);

  // Create 12 flats (4 floors × 3 flats)
  const flatNumbers = [
    "101", "102", "103",
    "201", "202", "203",
    "301", "302", "303",
    "401", "402", "403",
  ];

  for (const flatNumber of flatNumbers) {
    await db
      .insert(flats)
      .values({
        flatNumber,
        maintenanceAmount: 2000,
        pinHash: defaultPinHash,
      })
      .onConflictDoNothing();
  }
  console.log(`Created ${flatNumbers.length} flats`);

  // Open current month
  const now = new Date();
  await db
    .insert(months)
    .values({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      status: "open",
      dueDateDay: 10,
    })
    .onConflictDoNothing();
  console.log(`Opened month: ${now.getMonth() + 1}/${now.getFullYear()}`);

  // Set default config
  const adminPasswordHash = await bcrypt.hash("admin123", 12);
  const securityPinHash = await bcrypt.hash("1234", 12);

  const configValues = [
    { key: "admin_password_hash", value: adminPasswordHash },
    { key: "security_pin_hash", value: securityPinHash },
    { key: "due_date_day", value: "10" },
    { key: "telegram_bot_token", value: "" },
    { key: "telegram_admin_chat_id", value: "" },
    { key: "telegram_security_chat_id", value: "" },
    { key: "admin_whatsapp_number", value: "" },
  ];

  for (const cv of configValues) {
    await db.insert(config).values(cv).onConflictDoNothing();
  }
  console.log("Default config set (admin password: admin123, security PIN: 1234)");
  console.log("IMPORTANT: Change the default admin password and security PIN after first login!");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
