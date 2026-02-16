import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS } from "./constants";

export async function checkRateLimit(identifier: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        eq(loginAttempts.success, 0),
        gt(loginAttempts.attemptedAt, cutoff)
      )
    );

  return (result[0]?.count ?? 0) < MAX_LOGIN_ATTEMPTS;
}

export async function recordLoginAttempt(
  identifier: string,
  success: boolean
): Promise<void> {
  await db.insert(loginAttempts).values({
    identifier,
    success: success ? 1 : 0,
  });
}

export async function cleanupOldAttempts(): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, oneDayAgo));
}
