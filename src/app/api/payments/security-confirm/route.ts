import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, flats, months, config } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { PAYMENT_STATUS } from "@/lib/constants";
import { notifyAdmin } from "@/lib/telegram";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "security") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { paymentId } = await request.json();

    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment[0].status !== PAYMENT_STATUS.PENDING_SECURITY) {
      return NextResponse.json(
        { error: "Payment is not pending security confirmation" },
        { status: 400 }
      );
    }

    await db
      .update(payments)
      .set({
        status: PAYMENT_STATUS.PENDING_COLLECTION,
        securityConfirmedAt: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId));

    // Notify admin
    await notifyAdmin(
      `Security confirmed cash receipt: ₹${payment[0].amount.toLocaleString("en-IN")} — pending your collection.`
    );

    await checkAllSubmitted(payment[0].monthId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Security confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkAllSubmitted(monthId: number) {
  const allFlats = await db.select().from(flats);
  const monthPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.monthId, monthId));

  const monthRow = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
  if (!monthRow[0]) return;

  // Check if every flat has a non-rejected payment
  const validPayments = monthPayments.filter((p) => p.status !== "rejected");
  if (validPayments.length < allFlats.length) return;

  // All flats have submitted — check if there's still cash to collect
  const pendingCollection = monthPayments.filter((p) => p.status === "pending_collection");
  const digitalPaid = monthPayments.filter((p) => p.status === "paid");

  if (pendingCollection.length > 0) {
    const secNameRow = await db.select().from(config).where(eq(config.key, "security_name")).limit(1);
    const secName = secNameRow[0]?.value || "Security";
    const cashTotal = pendingCollection.reduce((sum, p) => sum + p.amount, 0);
    const digitalTotal = digitalPaid.reduce((sum, p) => sum + p.amount, 0);
    const monthLabel = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthRow[0].month - 1]} ${monthRow[0].year}`;

    await notifyAdmin(
      `All flats submitted for <b>${monthLabel}</b>!\n\nDigital: ₹${digitalTotal.toLocaleString("en-IN")}\nCash to collect from ${secName}: ₹${cashTotal.toLocaleString("en-IN")}\n\nPlease consolidate.`
    );
  }
}
