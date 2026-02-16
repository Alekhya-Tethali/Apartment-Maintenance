import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, flats, months } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notifyAdmin } from "@/lib/telegram";
import { PAYMENT_STATUS } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { paymentId } = await request.json();

    const payment = await db
      .select({
        id: payments.id,
        status: payments.status,
        flatId: payments.flatId,
        monthId: payments.monthId,
        amount: payments.amount,
      })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment[0].status !== PAYMENT_STATUS.PENDING_VERIFICATION) {
      return NextResponse.json(
        { error: "Payment is not pending verification" },
        { status: 400 }
      );
    }

    await db
      .update(payments)
      .set({
        status: PAYMENT_STATUS.PAID,
        verifiedAt: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId));

    // Check if all flats paid for this month
    await checkAllPaid(payment[0].monthId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkAllPaid(monthId: number) {
  const allFlats = await db.select().from(flats);
  const monthPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.monthId, monthId));

  const monthRow = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
  if (!monthRow[0]) return;

  const paidOrCollecting = monthPayments.filter(
    (p) => p.status === "paid" || p.status === "pending_collection"
  );

  if (paidOrCollecting.length >= allFlats.length) {
    const monthLabel = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthRow[0].month - 1]} ${monthRow[0].year}`;
    const cashPayments = monthPayments.filter(
      (p) => p.paymentMode === "cash" && p.status === "pending_collection"
    );
    const totalCollected = monthPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);

    if (cashPayments.length > 0) {
      await notifyAdmin(
        `All flats have submitted for <b>${monthLabel}</b>!\n\nCollected digitally: ₹${totalCollected.toLocaleString("en-IN")}\nCash to collect from security: ₹${cashTotal.toLocaleString("en-IN")}`
      );
    } else if (paidOrCollecting.length >= allFlats.length) {
      await notifyAdmin(
        `All flats paid for <b>${monthLabel}</b>! Total: ₹${(totalCollected + cashTotal).toLocaleString("en-IN")}`
      );
    }
  }
}
