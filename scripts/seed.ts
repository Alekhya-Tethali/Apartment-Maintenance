/**
 * Seed script for apartment maintenance app.
 *
 * Inserts 14 months of dummy data (Dec 2024 - Jan 2026) with realistic
 * payments, reminders, and config values for testing purposes.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Prerequisites:
 *   npm install --save-dev dotenv   (if not already installed)
 *   .env.local must contain TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import * as schema from "../src/db/schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlatRow {
  id: number;
  flatNumber: string;
  maintenanceAmount: number;
}

interface MonthRow {
  id: number;
  month: number;
  year: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seeded pseudo-random number generator (mulberry32) for reproducible data. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

/** Random integer in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Shuffle array in place (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Get the last day of a given month/year. */
function lastDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Create an ISO date string for a random time on a given date. */
function isoDate(year: number, month: number, day: number): string {
  const h = randInt(8, 22);
  const m = randInt(0, 59);
  const s = randInt(0, 59);
  return new Date(year, month - 1, day, h, m, s).toISOString();
}

/** Pick a payment mode with ~60% gpay, ~25% phonepe, ~15% cash. */
function pickPaymentMode(): string {
  const r = rand();
  if (r < 0.6) return "gpay";
  if (r < 0.85) return "phonepe";
  return "cash";
}

// ---------------------------------------------------------------------------
// Month definitions
// ---------------------------------------------------------------------------

interface MonthDef {
  month: number;
  year: number;
  status: "open" | "closed";
}

function buildMonthDefs(): MonthDef[] {
  const defs: MonthDef[] = [];
  // Dec 2024 => month=12, year=2024
  // Jan 2025 through Nov 2025 => month=1..11, year=2025
  // Dec 2025 => month=12, year=2025  (open)
  // Jan 2026 => month=1, year=2026   (open)

  // Dec 2024
  defs.push({ month: 12, year: 2024, status: "closed" });

  // Jan 2025 - Nov 2025
  for (let m = 1; m <= 11; m++) {
    defs.push({ month: m, year: 2025, status: "closed" });
  }

  // Dec 2025 (open)
  defs.push({ month: 12, year: 2025, status: "open" });

  // Jan 2026 (open)
  defs.push({ month: 1, year: 2026, status: "open" });

  return defs;
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

async function seed() {
  // --- Connect ---------------------------------------------------------------

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("ERROR: TURSO_DATABASE_URL is not set. Check your .env.local file.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  // --- Fetch flats -----------------------------------------------------------

  console.log("Fetching existing flats...");
  const allFlats: FlatRow[] = await db
    .select({
      id: schema.flats.id,
      flatNumber: schema.flats.flatNumber,
      maintenanceAmount: schema.flats.maintenanceAmount,
    })
    .from(schema.flats);

  if (allFlats.length === 0) {
    console.error("ERROR: No flats found in the database. Run the initial seed first (npx tsx src/db/seed.ts).");
    process.exit(1);
  }

  console.log(`  Found ${allFlats.length} flats: ${allFlats.map((f) => f.flatNumber).join(", ")}`);

  // Sort flats by flatNumber for deterministic ordering
  allFlats.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));

  // --- Check for existing months ---------------------------------------------

  const existingMonths = await db
    .select({ id: schema.months.id, month: schema.months.month, year: schema.months.year })
    .from(schema.months);

  const existingMonthKeys = new Set(existingMonths.map((m) => `${m.year}-${m.month}`));

  // --- Insert months ---------------------------------------------------------

  const monthDefs = buildMonthDefs();
  const insertedMonths: MonthRow[] = [];
  const skippedMonths: string[] = [];

  console.log("\nInserting months...");

  for (const def of monthDefs) {
    const key = `${def.year}-${def.month}`;

    if (existingMonthKeys.has(key)) {
      // Month already exists -- find its id from existingMonths
      const existing = existingMonths.find((m) => m.month === def.month && m.year === def.year)!;
      insertedMonths.push({ id: existing.id, month: def.month, year: def.year });
      skippedMonths.push(key);
      continue;
    }

    const lastDay = lastDayOfMonth(def.month, def.year);
    const closedAt =
      def.status === "closed"
        ? new Date(def.year, def.month - 1, lastDay, 23, 59, 59).toISOString()
        : null;

    const result = await db
      .insert(schema.months)
      .values({
        month: def.month,
        year: def.year,
        status: def.status,
        dueDateDay: 10,
        closedAt,
      })
      .returning({ id: schema.months.id });

    const monthId = result[0].id;
    insertedMonths.push({ id: monthId, month: def.month, year: def.year });
    console.log(
      `  Created month ${def.month}/${def.year} (id=${monthId}, status=${def.status}${closedAt ? ", closedAt=" + closedAt.slice(0, 10) : ""})`
    );
  }

  if (skippedMonths.length > 0) {
    console.log(`  Skipped ${skippedMonths.length} months that already exist: ${skippedMonths.join(", ")}`);
  }

  // --- Build a lookup from monthDef index to MonthRow -----------------------

  // monthDefs[0..11] are closed, monthDefs[12] is Dec 2025 (open), monthDefs[13] is Jan 2026 (open)
  const closedMonths = insertedMonths.slice(0, 12);
  const openMonth1 = insertedMonths[12]; // Dec 2025
  const openMonth2 = insertedMonths[13]; // Jan 2026

  // --- Payments for CLOSED months -------------------------------------------

  console.log("\nInserting payments for closed months...");

  let totalClosedPayments = 0;

  for (let mi = 0; mi < closedMonths.length; mi++) {
    const mRow = closedMonths[mi];
    const mDef = monthDefs[mi];
    const dueDay = 10;
    const lastDay = lastDayOfMonth(mDef.month, mDef.year);

    let monthPaymentCount = 0;

    for (const flat of allFlats) {
      const mode = pickPaymentMode();

      // submittedAt: some before due date, some after (roughly 70% before, 30% after)
      let submitDay: number;
      if (rand() < 0.7) {
        // Before or on due date
        submitDay = randInt(1, Math.min(dueDay, lastDay));
      } else {
        // After due date (late)
        submitDay = randInt(dueDay + 1, lastDay);
      }
      submitDay = Math.min(submitDay, lastDay);

      const submittedAt = isoDate(mDef.year, mDef.month, submitDay);

      // verifiedAt: 1-3 days after submission (capped to month)
      const verifyDay = Math.min(submitDay + randInt(1, 3), lastDay);
      const verifiedAt = isoDate(mDef.year, mDef.month, verifyDay);

      // For cash: also set securityConfirmedAt and collectedAt
      let securityConfirmedAt: string | null = null;
      let collectedAt: string | null = null;

      if (mode === "cash") {
        const confirmDay = Math.min(submitDay + randInt(0, 1), lastDay);
        securityConfirmedAt = isoDate(mDef.year, mDef.month, confirmDay);
        const collectDay = Math.min(confirmDay + randInt(0, 2), lastDay);
        collectedAt = isoDate(mDef.year, mDef.month, collectDay);
      }

      try {
        await db.insert(schema.payments).values({
          flatId: flat.id,
          monthId: mRow.id,
          amount: flat.maintenanceAmount,
          paymentMode: mode,
          status: "paid",
          submittedAt,
          verifiedAt,
          securityConfirmedAt,
          collectedAt,
          paymentDate: submittedAt.slice(0, 10),
        });
        monthPaymentCount++;
      } catch (err: unknown) {
        // Likely duplicate — skip silently
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("UNIQUE constraint")) {
          // Payment already exists for this flat+month, skip
        } else {
          throw err;
        }
      }
    }

    totalClosedPayments += monthPaymentCount;
    console.log(
      `  ${mDef.month}/${mDef.year}: ${monthPaymentCount} payments inserted`
    );
  }

  console.log(`  Total closed-month payments: ${totalClosedPayments}`);

  // --- Payments for OPEN month 1 (Dec 2025) ---------------------------------
  //   8 flats with payments: 4 paid, 2 pending_verification, 1 pending_security, 1 pending_collection
  //   4 flats with no payment (defaulters)

  console.log("\nInserting payments for open month 1 (Dec 2025)...");

  const shuffledFlats1 = shuffle([...allFlats]);
  const payingFlats1 = shuffledFlats1.slice(0, 8);
  const defaulterFlats1 = shuffledFlats1.slice(8); // 4 flats

  const openMonth1Def = monthDefs[12]; // Dec 2025
  const openMonth1Statuses: string[] = [
    "paid",
    "paid",
    "paid",
    "paid",
    "pending_verification",
    "pending_verification",
    "pending_security",
    "pending_collection",
  ];

  for (let i = 0; i < payingFlats1.length; i++) {
    const flat = payingFlats1[i];
    const status = openMonth1Statuses[i];
    const mode = status === "pending_security" || status === "pending_collection" ? "cash" : pickPaymentMode();

    const submitDay = randInt(1, 20);
    const submittedAt = isoDate(openMonth1Def.year, openMonth1Def.month, submitDay);

    let verifiedAt: string | null = null;
    let securityConfirmedAt: string | null = null;
    let collectedAt: string | null = null;

    if (status === "paid") {
      const verifyDay = Math.min(submitDay + randInt(1, 3), 28);
      verifiedAt = isoDate(openMonth1Def.year, openMonth1Def.month, verifyDay);
      if (mode === "cash") {
        securityConfirmedAt = isoDate(openMonth1Def.year, openMonth1Def.month, Math.min(submitDay + 1, 28));
        collectedAt = isoDate(openMonth1Def.year, openMonth1Def.month, Math.min(submitDay + 2, 28));
      }
    } else if (status === "pending_collection") {
      // Cash: security confirmed, but not yet collected or verified
      securityConfirmedAt = isoDate(openMonth1Def.year, openMonth1Def.month, Math.min(submitDay + 1, 28));
    }
    // pending_security and pending_verification: no extra timestamps

    try {
      await db.insert(schema.payments).values({
        flatId: flat.id,
        monthId: openMonth1.id,
        amount: flat.maintenanceAmount,
        paymentMode: mode,
        status,
        submittedAt,
        verifiedAt,
        securityConfirmedAt,
        collectedAt,
        paymentDate: submittedAt.slice(0, 10),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("UNIQUE constraint")) throw err;
    }
  }

  console.log(
    `  Dec 2025: 8 payments (4 paid, 2 pending_verification, 1 pending_security, 1 pending_collection)`
  );
  console.log(
    `  Dec 2025 defaulters: ${defaulterFlats1.map((f) => f.flatNumber).join(", ")}`
  );

  // --- Payments for OPEN month 2 (Jan 2026) ---------------------------------
  //   3 flats with payments: 2 paid, 1 pending_verification
  //   9 flats with no payment (defaulters)

  console.log("\nInserting payments for open month 2 (Jan 2026)...");

  const shuffledFlats2 = shuffle([...allFlats]);
  const payingFlats2 = shuffledFlats2.slice(0, 3);
  const defaulterFlats2 = shuffledFlats2.slice(3); // 9 flats

  const openMonth2Def = monthDefs[13]; // Jan 2026
  const openMonth2Statuses: string[] = ["paid", "paid", "pending_verification"];

  for (let i = 0; i < payingFlats2.length; i++) {
    const flat = payingFlats2[i];
    const status = openMonth2Statuses[i];
    const mode = pickPaymentMode();

    const submitDay = randInt(1, 15);
    const submittedAt = isoDate(openMonth2Def.year, openMonth2Def.month, submitDay);

    let verifiedAt: string | null = null;

    if (status === "paid") {
      const verifyDay = Math.min(submitDay + randInt(1, 3), 28);
      verifiedAt = isoDate(openMonth2Def.year, openMonth2Def.month, verifyDay);
    }

    try {
      await db.insert(schema.payments).values({
        flatId: flat.id,
        monthId: openMonth2.id,
        amount: flat.maintenanceAmount,
        paymentMode: mode,
        status,
        submittedAt,
        verifiedAt,
        paymentDate: submittedAt.slice(0, 10),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("UNIQUE constraint")) throw err;
    }
  }

  console.log(
    `  Jan 2026: 3 payments (2 paid, 1 pending_verification)`
  );
  console.log(
    `  Jan 2026 defaulters: ${defaulterFlats2.map((f) => f.flatNumber).join(", ")}`
  );

  // --- Reminders for defaulter flats in open months -------------------------

  console.log("\nInserting reminders for defaulters...");

  let reminderCount = 0;

  // 2 reminders for Dec 2025 defaulters
  for (let i = 0; i < Math.min(2, defaulterFlats1.length); i++) {
    const flat = defaulterFlats1[i];
    try {
      await db.insert(schema.reminders).values({
        flatId: flat.id,
        monthId: openMonth1.id,
        sentBy: "admin",
        sentAt: isoDate(2025, 12, randInt(15, 25)),
      });
      reminderCount++;
      console.log(`  Reminder sent to flat ${flat.flatNumber} for Dec 2025`);
    } catch {
      // skip on error
    }
  }

  // 2 reminders for Jan 2026 defaulters
  for (let i = 0; i < Math.min(2, defaulterFlats2.length); i++) {
    const flat = defaulterFlats2[i];
    try {
      await db.insert(schema.reminders).values({
        flatId: flat.id,
        monthId: openMonth2.id,
        sentBy: "admin",
        sentAt: isoDate(2026, 1, randInt(12, 17)),
      });
      reminderCount++;
      console.log(`  Reminder sent to flat ${flat.flatNumber} for Jan 2026`);
    } catch {
      // skip on error
    }
  }

  console.log(`  Total reminders inserted: ${reminderCount}`);

  // --- Config values ---------------------------------------------------------

  console.log("\nInserting config values...");

  const configEntries = [
    { key: "security_name", value: "Shankar" },
    { key: "admin_name", value: "Bangar Reddy" },
  ];

  for (const entry of configEntries) {
    try {
      await db.insert(schema.config).values(entry).onConflictDoNothing();
      console.log(`  Config: ${entry.key} = ${entry.value}`);
    } catch {
      console.log(`  Config: ${entry.key} already exists, skipped`);
    }
  }

  // --- Done ------------------------------------------------------------------

  console.log("\n========================================");
  console.log("Seed complete!");
  console.log(`  Months:   ${insertedMonths.length} (${closedMonths.length} closed, 2 open)`);
  console.log(`  Payments: ${totalClosedPayments + 8 + 3} total`);
  console.log(`  Reminders: ${reminderCount}`);
  console.log(`  Config:   ${configEntries.length} entries`);
  console.log("========================================\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeed FAILED:", err);
  process.exit(1);
});
