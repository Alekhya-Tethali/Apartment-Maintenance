import { NextResponse } from "next/server";
import { db } from "@/db";
import { months, payments, flats, config } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateMonthReport } from "@/lib/pdf";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ monthId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { monthId: monthIdStr } = await params;
    const monthId = parseInt(monthIdStr);

    const monthRow = await db.select().from(months).where(eq(months.id, monthId)).limit(1);
    if (!monthRow[0]) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    const allFlats = await db.select().from(flats);
    const monthPayments = await db
      .select({
        flatNumber: flats.flatNumber,
        amount: payments.amount,
        paymentMode: payments.paymentMode,
        submittedAt: payments.submittedAt,
        status: payments.status,
      })
      .from(payments)
      .innerJoin(flats, eq(payments.flatId, flats.id))
      .where(eq(payments.monthId, monthId));

    const secNameRow = await db.select().from(config).where(eq(config.key, "security_name")).limit(1);
    const secName = secNameRow[0]?.value || "Security";
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

    const pdfBuffer = generateMonthReport(monthLabel, reportRows, allFlats.length);
    const filename = `Laurel-Residency-${monthLabel.replace(" ", "-")}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
