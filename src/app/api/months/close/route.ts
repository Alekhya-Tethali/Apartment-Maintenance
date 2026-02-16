import { NextResponse } from "next/server";
import { db } from "@/db";
import { months } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { monthId } = await request.json();

    const monthRow = await db
      .select()
      .from(months)
      .where(eq(months.id, monthId))
      .limit(1);

    if (!monthRow[0]) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    if (monthRow[0].status === "closed") {
      return NextResponse.json({ error: "Month already closed" }, { status: 400 });
    }

    await db
      .update(months)
      .set({
        status: "closed",
        closedAt: new Date().toISOString(),
      })
      .where(eq(months.id, monthId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Close month error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
