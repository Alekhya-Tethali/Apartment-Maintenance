import { NextResponse } from "next/server";
import { db } from "@/db";
import { reminders, flats, months } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET: List reminders for a month
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "security")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const monthId = searchParams.get("monthId");

  if (!monthId) {
    return NextResponse.json({ error: "monthId required" }, { status: 400 });
  }

  try {
    const result = await db
      .select({
        id: reminders.id,
        flatId: reminders.flatId,
        flatNumber: flats.flatNumber,
        monthId: reminders.monthId,
        sentBy: reminders.sentBy,
        sentAt: reminders.sentAt,
      })
      .from(reminders)
      .innerJoin(flats, eq(reminders.flatId, flats.id))
      .where(eq(reminders.monthId, parseInt(monthId)))
      .orderBy(desc(reminders.sentAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reminders list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Record that a reminder was sent
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "security")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { flatId, monthId } = await request.json();

    if (!flatId || !monthId) {
      return NextResponse.json({ error: "flatId and monthId required" }, { status: 400 });
    }

    // Verify month exists
    const monthRow = await db
      .select()
      .from(months)
      .where(eq(months.id, monthId))
      .limit(1);

    if (!monthRow[0]) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    const [reminder] = await db
      .insert(reminders)
      .values({
        flatId,
        monthId,
        sentBy: session.role,
      })
      .returning();

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Record reminder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
