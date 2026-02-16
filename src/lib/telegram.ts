import { db } from "@/db";
import { config } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getConfig(key: string): Promise<string | null> {
  const result = await db
    .select()
    .from(config)
    .where(eq(config.key, key))
    .limit(1);
  return result[0]?.value ?? null;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  const token = await getConfig("telegram_bot_token");
  if (!token || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("Telegram send failed:", error);
    return false;
  }
}

export async function notifyAdmin(message: string): Promise<boolean> {
  const chatId = await getConfig("telegram_admin_chat_id");
  if (!chatId) return false;
  return sendTelegramMessage(chatId, message);
}

export async function notifySecurity(message: string): Promise<boolean> {
  const chatId = await getConfig("telegram_security_chat_id");
  if (!chatId) return false;
  return sendTelegramMessage(chatId, message);
}

export function formatDefaulterList(
  defaulters: { flatNumber: string; amount: number }[],
  monthLabel: string
): string {
  if (defaulters.length === 0) return `All flats have paid for ${monthLabel}!`;
  const lines = defaulters.map(
    (d, i) => `${i + 1}. Flat ${d.flatNumber} — ₹${d.amount.toLocaleString("en-IN")}`
  );
  return `<b>Defaulters for ${monthLabel}</b>\n\n${lines.join("\n")}\n\nTotal pending: ${defaulters.length} flat(s)`;
}

export function formatCollectionSummary(
  monthLabel: string,
  totalCollected: number,
  cashFromSecurity: number,
  digitalDirect: number,
  cashFlats: { flatNumber: string; amount: number }[]
): string {
  const cashDetails = cashFlats.length
    ? cashFlats.map((f) => `  • Flat ${f.flatNumber}: ₹${f.amount.toLocaleString("en-IN")}`).join("\n")
    : "  None";

  return [
    `<b>All Payments Collected — ${monthLabel}</b>`,
    ``,
    `Total: ₹${totalCollected.toLocaleString("en-IN")}`,
    `Digital (direct): ₹${digitalDirect.toLocaleString("en-IN")}`,
    `Cash (collect from security): ₹${cashFromSecurity.toLocaleString("en-IN")}`,
    ``,
    `<b>Cash breakdown:</b>`,
    cashDetails,
  ].join("\n");
}

export function formatWhatsAppReminder(
  flatNumber: string,
  amount: number,
  monthLabel: string
): string {
  return `Hi, this is a reminder that Flat ${flatNumber}'s maintenance of ₹${amount.toLocaleString("en-IN")} for ${monthLabel} is overdue. Please pay at the earliest. Thank you.`;
}
