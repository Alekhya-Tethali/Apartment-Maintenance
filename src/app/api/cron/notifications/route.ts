import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats, payments, months, config } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyAdmin, notifySecurity, formatDefaulterList, formatWhatsAppReminder } from "@/lib/telegram";
import { decryptText } from "@/lib/crypto";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Auto-open month if not exists
    const existingMonth = await db
      .select()
      .from(months)
      .where(and(eq(months.month, currentMonth), eq(months.year, currentYear)))
      .limit(1);

    if (!existingMonth[0]) {
      await db.insert(months).values({
        month: currentMonth,
        year: currentYear,
        status: "open",
        dueDateDay: 10,
      });
    }

    // Get open month
    const openMonth = await db
      .select()
      .from(months)
      .where(and(eq(months.month, currentMonth), eq(months.year, currentYear)))
      .limit(1);

    if (!openMonth[0] || openMonth[0].status === "closed") {
      return NextResponse.json({ message: "No open month" });
    }

    const monthLabel = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

    // Get all flats and their payments
    const allFlats = await db.select().from(flats);
    const monthPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.monthId, openMonth[0].id));

    const paidFlatIds = monthPayments
      .filter((p) => p.status !== "rejected")
      .map((p) => p.flatId);

    const defaulterFlats = allFlats.filter((f) => !paidFlatIds.includes(f.id));

    // Check for idempotency
    const notifKey = `notif_${currentYear}_${currentMonth}_${dayOfMonth}`;
    const alreadySent = await db
      .select()
      .from(config)
      .where(eq(config.key, notifKey))
      .limit(1);

    if (alreadySent[0]) {
      return NextResponse.json({ message: "Already sent today" });
    }

    let sent = false;

    // 11th: notify security
    if (dayOfMonth === 11 && defaulterFlats.length > 0) {
      const list = defaulterFlats.map((f) => ({
        flatNumber: f.flatNumber,
        amount: f.maintenanceAmount,
      }));
      await notifySecurity(
        `${formatDefaulterList(list, monthLabel)}\n\nPlease remind them to pay.`
      );
      sent = true;
    }

    // 20th: notify admin with WhatsApp messages
    if (dayOfMonth === 20 && defaulterFlats.length > 0) {
      const list = defaulterFlats.map((f) => ({
        flatNumber: f.flatNumber,
        amount: f.maintenanceAmount,
      }));

      let adminMessage = formatDefaulterList(list, monthLabel);
      adminMessage += "\n\n<b>Copy-paste messages:</b>\n";

      for (const flat of defaulterFlats) {
        const reminder = formatWhatsAppReminder(
          flat.flatNumber,
          flat.maintenanceAmount,
          monthLabel
        );
        let phoneInfo = "";
        if (flat.phoneEncrypted && flat.phoneIv && flat.phoneTag) {
          try {
            const phone = decryptText(flat.phoneEncrypted, flat.phoneIv, flat.phoneTag);
            phoneInfo = ` (wa.me/${phone})`;
          } catch {
            // ignore decryption errors
          }
        }
        adminMessage += `\nFlat ${flat.flatNumber}${phoneInfo}:\n${reminder}\n`;
      }

      await notifyAdmin(adminMessage);
      sent = true;
    }

    // Check if all paid — notify admin
    if (defaulterFlats.length === 0) {
      const totalCollected = monthPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const cashPending = monthPayments
        .filter((p) => p.status === "pending_collection")
        .reduce((sum, p) => sum + p.amount, 0);

      if (totalCollected > 0 || cashPending > 0) {
        await notifyAdmin(
          `All flats have submitted for <b>${monthLabel}</b>!\n\nCollected: ₹${totalCollected.toLocaleString("en-IN")}\nCash to collect from security: ₹${cashPending.toLocaleString("en-IN")}`
        );
        sent = true;
      }
    }

    // Record that we sent notifications today
    if (sent) {
      await db.insert(config).values({ key: notifKey, value: new Date().toISOString() }).onConflictDoNothing();
    }

    return NextResponse.json({
      message: "Cron executed",
      day: dayOfMonth,
      defaulters: defaulterFlats.length,
      sent,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
