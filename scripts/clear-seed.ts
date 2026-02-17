/**
 * Clear seed data from the apartment maintenance database.
 *
 * Deletes all payments, reminders, and months.
 * Does NOT delete flats, config, or loginAttempts.
 *
 * Usage:
 *   npx tsx scripts/clear-seed.ts
 *
 * Prerequisites:
 *   npm install --save-dev dotenv   (if not already installed)
 *   .env.local must contain TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function clearSeed() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("ERROR: TURSO_DATABASE_URL is not set. Check your .env.local file.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  // --- Count existing rows before deletion -----------------------------------

  const paymentCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.payments);
  const paymentCount = paymentCountResult[0].count;

  const reminderCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.reminders);
  const reminderCount = reminderCountResult[0].count;

  const monthCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.months);
  const monthCount = monthCountResult[0].count;

  console.log(`\nFound:`);
  console.log(`  ${paymentCount} payments`);
  console.log(`  ${reminderCount} reminders`);
  console.log(`  ${monthCount} months`);

  // --- Delete in correct order (respect foreign keys) ------------------------

  // 1. Delete payments (references flats and months)
  console.log(`\nDeleting ${paymentCount} payments...`);
  await db.delete(schema.payments);
  console.log("  Done.");

  // 2. Delete reminders (references flats and months)
  console.log(`Deleting ${reminderCount} reminders...`);
  await db.delete(schema.reminders);
  console.log("  Done.");

  // 3. Delete months
  console.log(`Deleting ${monthCount} months...`);
  await db.delete(schema.months);
  console.log("  Done.");

  // --- Summary ---------------------------------------------------------------

  console.log("\n========================================");
  console.log("Clear complete!");
  console.log(`  Deleted ${paymentCount} payments`);
  console.log(`  Deleted ${reminderCount} reminders`);
  console.log(`  Deleted ${monthCount} months`);
  console.log("");
  console.log("  Kept: flats, config, loginAttempts");
  console.log("========================================\n");

  process.exit(0);
}

clearSeed().catch((err) => {
  console.error("\nClear FAILED:", err);
  process.exit(1);
});
