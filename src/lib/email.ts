import nodemailer from "nodemailer";
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

export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  body: string,
  attachment: { buffer: Buffer; filename: string }
): Promise<boolean> {
  const emailAddress = await getConfig("backup_email_address");
  const emailPassword = await getConfig("backup_email_password");

  if (!emailAddress || !emailPassword) {
    console.error("Backup email not configured");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailAddress,
        pass: emailPassword,
      },
    });

    await transporter.sendMail({
      from: emailAddress,
      to,
      subject,
      text: body,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.buffer,
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}

export async function sendBackupEmail(
  buffer: Buffer,
  filename: string
): Promise<boolean> {
  const to = await getConfig("backup_email_address");
  if (!to) return false;

  const date = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return sendEmailWithAttachment(
    to,
    `Laurel Residency — Weekly Backup (${date})`,
    `Automated weekly database backup.\n\nFile: ${filename}\nGenerated: ${new Date().toISOString()}\n\nThis is an automated email. Do not reply.`,
    { buffer, filename }
  );
}
