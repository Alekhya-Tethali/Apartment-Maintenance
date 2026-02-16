import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
  }

  try {
    const payment = await db
      .select()
      .from(payments)
      .where(eq(payments.id, parseInt(paymentId)))
      .limit(1);

    if (!payment[0] || !payment[0].screenshotBlobUrl) {
      return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
    }

    // Fetch encrypted screenshot from Vercel Blob
    const response = await fetch(payment[0].screenshotBlobUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch screenshot" }, { status: 500 });
    }

    const encryptedBuffer = Buffer.from(await response.arrayBuffer());

    // Decrypt
    const decrypted = decrypt(
      encryptedBuffer,
      payment[0].screenshotIv!,
      payment[0].screenshotTag!
    );

    // Return as image
    return new NextResponse(new Uint8Array(decrypted), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Screenshot decrypt error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
