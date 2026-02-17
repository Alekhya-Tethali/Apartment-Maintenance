import { NextResponse } from "next/server";
import { db } from "@/db";
import { months, payments, flats, config } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateMonthReport } from "@/lib/pdf";
import { notifyAdminWithDocument } from "@/lib/telegram";

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

    // Generate and send PDF report
    try {
      const monthPayments = await db
        .select({
          flatNumber: flats.flatNumber,
          amount: payments.amount,
          paymentMode: payments.paymentMode,
          submittedAt: payments.submittedAt,
          status: payments.status,
          securityConfirmedAt: payments.securityConfirmedAt,
          collectedAt: payments.collectedAt,
        })
        .from(payments)
        .innerJoin(flats, eq(payments.flatId, flats.id))
        .where(eq(payments.monthId, monthId));

      const secNameRow = await db.select().from(config).where(eq(config.key, "security_name")).limit(1);
      const secName = secNameRow[0]?.value || "Security";
      const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthLabel = `${MONTH_NAMES[monthRow[0].month - 1]} ${monthRow[0].year}`;

      const reportRows = monthPayments.map((p) => {
        let statusDesc = "Paid";
        if (p.paymentMode === "cash") {
          statusDesc = `Cash — collected from ${secName}`;
        } else {
          statusDesc = `Verified (${p.paymentMode === "gpay" ? "GPay" : "PhonePe"})`;
        }
        return {
          flatNumber: p.flatNumber,
          amount: p.amount,
          paymentMode: p.paymentMode,
          submittedAt: p.submittedAt,
          statusDescription: statusDesc,
        };
      });

      const pdfBuffer = generateMonthReport(monthLabel, reportRows, totalFlats);
      const filename = `Laurel-Residency-${monthLabel.replace(" ", "-")}.pdf`;
      await notifyAdminWithDocument(pdfBuffer, filename, `Monthly report for ${monthLabel}`);
    } catch (pdfError) {
      console.error("PDF generation/send failed:", pdfError);
      // Don't block the close operation
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Close month error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
