import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { PAYMENT_STATUS } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { paymentId, reason } = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const payment = await db
      .select()
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
        status: PAYMENT_STATUS.REJECTED,
        adminNote: reason,
        verifiedAt: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
