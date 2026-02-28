import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats, payments, months } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notifyAdmin, formatDefaulterList } from "@/lib/telegram";
import { MONTH_NAMES } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { monthId } = await request.json();
    if (!monthId) {
      return NextResponse.json({ error: "monthId required" }, { status: 400 });
    }

    const month = await db
      .select()
      .from(months)
      .where(eq(months.id, monthId))
      .limit(1);

    if (!month[0]) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    const monthLabel = `${MONTH_NAMES[month[0].month - 1]} ${month[0].year}`;

    const allFlats = await db.select().from(flats);
    const monthPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.monthId, monthId));

    const paidFlatIds = monthPayments
      .filter((p) => p.status !== "rejected")
      .map((p) => p.flatId);

    const defaulterFlats = allFlats.filter((f) => !paidFlatIds.includes(f.id));

    let message: string;

    if (defaulterFlats.length === 0) {
      const totalCollected = monthPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const cashPending = monthPayments
        .filter((p) => p.status === "pending_collection")
        .reduce((sum, p) => sum + p.amount, 0);

      message = `All flats have submitted for <b>${monthLabel}</b>!\n\nCollected: \u20B9${totalCollected.toLocaleString("en-IN")}\nCash to collect from security: \u20B9${cashPending.toLocaleString("en-IN")}`;
    } else {
      const list = defaulterFlats.map((f) => ({
        flatNumber: f.flatNumber,
        amount: f.maintenanceAmount,
      }));
      message = formatDefaulterList(list, monthLabel);
    }

    const sent = await notifyAdmin(message);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send. Check Telegram config." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      defaulters: defaulterFlats.length,
      total: allFlats.length,
    });
  } catch (error) {
    console.error("Trigger notification error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
