import { NextResponse } from "next/server";
import { db } from "@/db";
import { months } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { openMonthSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let result;
    if (session.role === "security") {
      // Security only sees open months
      result = await db
        .select()
        .from(months)
        .where(eq(months.status, "open"))
        .orderBy(desc(months.year), desc(months.month));
    } else {
      result = await db
        .select()
        .from(months)
        .orderBy(desc(months.year), desc(months.month));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Months list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = openMonthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { month, year } = parsed.data;

    const [newMonth] = await db
      .insert(months)
      .values({ month, year, status: "open", dueDateDay: 10 })
      .onConflictDoNothing()
      .returning();

    if (!newMonth) {
      return NextResponse.json({ error: "Month already exists" }, { status: 409 });
    }

    return NextResponse.json(newMonth, { status: 201 });
  } catch (error) {
    console.error("Open month error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
