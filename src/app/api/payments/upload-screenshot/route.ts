import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "resident" || !session.flatId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;
    const paymentId = formData.get("paymentId") as string | null;

    if (!file || !paymentId) {
      return NextResponse.json(
        { error: "Screenshot and payment ID are required" },
        { status: 400 }
      );
    }

    // Verify payment belongs to this flat
    const payment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, parseInt(paymentId)),
          eq(payments.flatId, session.flatId)
        )
      )
      .limit(1);

    if (!payment[0]) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment[0].status !== "pending_verification") {
      return NextResponse.json(
        { error: "Payment is not awaiting screenshot" },
        { status: 400 }
      );
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Encrypt the screenshot
    const { encrypted, iv, tag } = encrypt(buffer);

    // Upload encrypted file to Vercel Blob
    const blob = await put(
      `screenshots/${paymentId}-${Date.now()}.enc`,
      encrypted,
      {
        access: "public",
        contentType: "application/octet-stream",
      }
    );

    // Update payment with screenshot info
    await db
      .update(payments)
      .set({
        screenshotBlobUrl: blob.url,
        screenshotIv: iv,
        screenshotTag: tag,
      })
      .where(eq(payments.id, parseInt(paymentId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Screenshot upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
