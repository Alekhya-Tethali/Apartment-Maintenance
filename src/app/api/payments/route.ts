import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, flats, months } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { submitPaymentSchema } from "@/lib/validators";
import { PAYMENT_STATUS } from "@/lib/constants";
import { notifyAdmin } from "@/lib/telegram";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthId = searchParams.get("monthId");
  const status = searchParams.get("status");

  try {
    let query = db
      .select({
        id: payments.id,
        flatId: payments.flatId,
        flatNumber: flats.flatNumber,
        monthId: payments.monthId,
        month: months.month,
        year: months.year,
        amount: payments.amount,
        paymentMode: payments.paymentMode,
        status: payments.status,
        submittedAt: payments.submittedAt,
        securityConfirmedAt: payments.securityConfirmedAt,
        verifiedAt: payments.verifiedAt,
        collectedAt: payments.collectedAt,
        adminNote: payments.adminNote,
        hasScreenshot: payments.screenshotBlobUrl,
      })
      .from(payments)
      .innerJoin(flats, eq(payments.flatId, flats.id))
      .innerJoin(months, eq(payments.monthId, months.id))
      .orderBy(desc(payments.submittedAt))
      .$dynamic();

    // Resident: only own payments
    if (session.role === "resident" && session.flatId) {
      query = query.where(eq(payments.flatId, session.flatId));
    }

    // Security: only open months
    if (session.role === "security") {
      query = query.where(eq(months.status, "open"));
    }

    // Filter by monthId
    if (monthId) {
      query = query.where(eq(payments.monthId, parseInt(monthId)));
    }

    // Filter by status
    if (status) {
      query = query.where(eq(payments.status, status));
    }

    const results = await query;

    return NextResponse.json(
      results.map((r) => ({
        ...r,
        hasScreenshot: !!r.hasScreenshot,
      }))
    );
  } catch (error) {
    console.error("Payments list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "resident" || !session.flatId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = submitPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { monthId, paymentMode } = parsed.data;

    // Verify month is open
    const monthRow = await db
      .select()
      .from(months)
      .where(and(eq(months.id, monthId), eq(months.status, "open")))
      .limit(1);

    if (!monthRow[0]) {
      return NextResponse.json(
        { error: "Month is not open for payments" },
        { status: 400 }
      );
    }

    // Get flat details
    const flat = await db
      .select()
      .from(flats)
      .where(eq(flats.id, session.flatId))
      .limit(1);

    if (!flat[0]) {
      return NextResponse.json({ error: "Flat not found" }, { status: 404 });
    }

    // Check for existing active payment (not rejected)
    const existing = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.flatId, session.flatId),
          eq(payments.monthId, monthId)
        )
      )
      .limit(1);

    if (existing[0] && existing[0].status !== "rejected") {
      return NextResponse.json(
        { error: "Payment already submitted for this month" },
        { status: 400 }
      );
    }

    // If previous was rejected, delete it so new one can be created
    if (existing[0] && existing[0].status === "rejected") {
      await db.delete(payments).where(eq(payments.id, existing[0].id));
    }

    // Determine initial status
    const initialStatus =
      paymentMode === "cash"
        ? PAYMENT_STATUS.PENDING_SECURITY
        : PAYMENT_STATUS.PENDING_VERIFICATION;

    const [payment] = await db
      .insert(payments)
      .values({
        flatId: session.flatId,
        monthId,
        amount: flat[0].maintenanceAmount,
        paymentMode,
        status: initialStatus,
      })
      .returning();

    // Notify admin
    const modeLabel = paymentMode === "cash" ? "Cash to Security" : paymentMode === "gpay" ? "GPay" : "PhonePe";
    const monthLabel = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthRow[0].month - 1]} ${monthRow[0].year}`;
    await notifyAdmin(
      `New payment from <b>Flat ${session.flatNumber}</b>\nMode: ${modeLabel}\nAmount: ₹${flat[0].maintenanceAmount.toLocaleString("en-IN")}\nMonth: ${monthLabel}\nStatus: ${initialStatus === "pending_security" ? "Pending Security Confirmation" : "Pending Screenshot Verification"}`
    );

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Payment submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
