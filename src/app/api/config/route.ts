import { NextResponse } from "next/server";
import { db } from "@/db";
import { config } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";
import { updateConfigSchema } from "@/lib/validators";

const SAFE_KEYS = ["due_date_day", "admin_whatsapp_number", "webapp_url"];

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const allConfig = await db.select().from(config);
    const result: Record<string, string> = {};
    for (const row of allConfig) {
      // Don't expose hashes or tokens
      if (SAFE_KEYS.includes(row.key)) {
        result[row.key] = row.value;
      } else {
        result[row.key] = row.value ? "(set)" : "(not set)";
      }
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Config get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data = parsed.data;

    if (data.dueDateDay !== undefined) {
      await upsertConfig("due_date_day", data.dueDateDay.toString());
    }

    if (data.securityPin) {
      const hash = await hashPassword(data.securityPin);
      await upsertConfig("security_pin_hash", hash);
    }

    if (data.adminPassword) {
      const hash = await hashPassword(data.adminPassword);
      await upsertConfig("admin_password_hash", hash);
    }

    if (data.telegramBotToken !== undefined) {
      await upsertConfig("telegram_bot_token", data.telegramBotToken);
    }

    if (data.telegramAdminChatId !== undefined) {
      await upsertConfig("telegram_admin_chat_id", data.telegramAdminChatId);
    }

    if (data.telegramSecurityChatId !== undefined) {
      await upsertConfig("telegram_security_chat_id", data.telegramSecurityChatId);
    }

    if (data.adminWhatsappNumber !== undefined) {
      await upsertConfig("admin_whatsapp_number", data.adminWhatsappNumber);
    }

    if (data.webappUrl !== undefined) {
      await upsertConfig("webapp_url", data.webappUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function upsertConfig(key: string, value: string) {
  const existing = await db
    .select()
    .from(config)
    .where(eq(config.key, key))
    .limit(1);

  if (existing[0]) {
    await db.update(config).set({ value }).where(eq(config.key, key));
  } else {
    await db.insert(config).values({ key, value });
  }
}
