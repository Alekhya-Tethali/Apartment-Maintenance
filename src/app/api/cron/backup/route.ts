import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats, months, payments, reminders, amountOverrides, updateRequests, config } from "@/db/schema";
import { sendBackupEmail } from "@/lib/email";

// Config keys to exclude from backup (sensitive)
const SENSITIVE_KEYS = [
  "admin_password_hash",
  "security_pin_hash",
  "telegram_bot_token",
  "telegram_admin_chat_id",
  "telegram_security_chat_id",
  "backup_email_password",
];

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Query all tables
    const [
      flatsData,
      monthsData,
      paymentsData,
      remindersData,
      overridesData,
      requestsData,
      configData,
    ] = await Promise.all([
      db.select().from(flats),
      db.select().from(months),
      db.select().from(payments),
      db.select().from(reminders),
      db.select().from(amountOverrides),
      db.select().from(updateRequests),
      db.select().from(config),
    ]);

    // Filter out sensitive config and encrypted fields from flats
    const safeConfig = configData.filter(
      (c) => !SENSITIVE_KEYS.includes(c.key)
    );

    const safeFlats = flatsData.map((f) => ({
      id: f.id,
      flatNumber: f.flatNumber,
      maintenanceAmount: f.maintenanceAmount,
      ownerName: f.ownerName,
      isRented: f.isRented,
      tenantName: f.tenantName,
      createdAt: f.createdAt,
    }));

    const backup = {
      exportedAt: new Date().toISOString(),
      tables: {
        flats: safeFlats,
        months: monthsData,
        payments: paymentsData,
        reminders: remindersData,
        amountOverrides: overridesData,
        updateRequests: requestsData,
        config: safeConfig,
      },
    };

    const buffer = Buffer.from(JSON.stringify(backup, null, 2));
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `backup-${dateStr}.json`;

    const sent = await sendBackupEmail(buffer, filename);

    if (!sent) {
      return NextResponse.json(
        { error: "Backup generated but email failed. Check email config." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Backup sent: ${filename}`,
      tables: {
        flats: safeFlats.length,
        months: monthsData.length,
        payments: paymentsData.length,
        reminders: remindersData.length,
        amountOverrides: overridesData.length,
        updateRequests: requestsData.length,
        config: safeConfig.length,
      },
    });
  } catch (error) {
    console.error("Backup cron error:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
