import { NextResponse } from "next/server";
import { db } from "@/db";
import { months, payments, flats } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
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

    // Check that all flats have paid
    const allFlats = await db.select({ total: count() }).from(flats);
    const totalFlats = allFlats[0]?.total ?? 0;

    const paidPayments = await db
      .select({ total: count() })
      .from(payments)
      .where(
        and(
          eq(payments.monthId, monthId),
          eq(payments.status, "paid")
        )
      );
    const paidCount = paidPayments[0]?.total ?? 0;

    if (paidCount < totalFlats) {
      const unpaid = totalFlats - paidCount;
      return NextResponse.json(
        { error: `Cannot close: ${unpaid} flat${unpaid > 1 ? "s" : ""} still unpaid` },
        { status: 400 }
      );
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
