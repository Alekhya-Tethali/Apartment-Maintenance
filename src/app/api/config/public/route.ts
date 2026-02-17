import { NextResponse } from "next/server";
import { db } from "@/db";
import { config } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public config keys that any logged-in user can read
const PUBLIC_KEYS = ["security_name", "admin_name"];

export async function GET() {
  try {
    const result: Record<string, string> = {};
    for (const key of PUBLIC_KEYS) {
      const row = await db
        .select()
        .from(config)
        .where(eq(config.key, key))
        .limit(1);
      if (row[0]) {
        result[key] = row[0].value;
      }
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
