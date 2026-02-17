import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, flats, months } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { PAYMENT_STATUS } from "@/lib/constants";

const VALID_STATUSES = Object.values(PAYMENT_STATUS);

/**
 * Admin-only endpoint to override payment status or create a payment on behalf of a resident.
 *
 * PATCH: Update an existing payment's status and/or admin note.
 * POST:  Create a new payment record (for when resident paid but couldn't submit).
 */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { paymentId, status, adminNote } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!payment[0]) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      updates.status = status;

      // Set relevant timestamps based on target status
      if (status === "paid" && !payment[0].verifiedAt) {
        updates.verifiedAt = new Date().toISOString();
      }
      if (status === "paid" && payment[0].paymentMode === "cash" && !payment[0].collectedAt) {
        updates.collectedAt = new Date().toISOString();
      }
    }

    if (adminNote !== undefined) {
      updates.adminNote = adminNote || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, paymentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { flatId, monthId, amount, paymentMode, status, paymentDate, adminNote } = await request.json();

    if (!flatId || !monthId) {
      return NextResponse.json({ error: "flatId and monthId are required" }, { status: 400 });
    }

    // Verify flat and month exist
    const flat = await db.select().from(flats).where(eq(flats.id, flatId)).limit(1);
    if (!flat[0]) {
      return NextResponse.json({ error: "Flat not found" }, { status: 404 });
    }

    const month = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
    if (!month[0]) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    // Check for existing payment
    const existing = await db
      .select()
      .from(payments)
      .where(and(eq(payments.flatId, flatId), eq(payments.monthId, monthId)))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: "Payment already exists for this flat and month. Use PATCH to update it." },
        { status: 409 }
      );
    }

    const targetStatus = status || "paid";
    const now = new Date().toISOString();

    const [newPayment] = await db
      .insert(payments)
      .values({
        flatId,
        monthId,
        amount: amount || flat[0].maintenanceAmount,
        paymentMode: paymentMode || "cash",
        status: targetStatus,
        paymentDate: paymentDate || now,
        submittedAt: now,
        verifiedAt: targetStatus === "paid" ? now : null,
        collectedAt: targetStatus === "paid" && (paymentMode === "cash" || !paymentMode) ? now : null,
        adminNote: adminNote || "Recorded by admin",
      })
      .returning();

    return NextResponse.json({ success: true, id: newPayment.id });
  } catch (error) {
    console.error("Admin create payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
