import { NextResponse } from "next/server";
import { db } from "@/db";
import { updateRequests, flats, months, amountOverrides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { encryptText } from "@/lib/crypto";
import { reviewRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = reviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const req = await db
      .select()
      .from(updateRequests)
      .where(eq(updateRequests.id, parsed.data.requestId))
      .limit(1);

    if (!req[0] || req[0].status !== "pending") {
      return NextResponse.json(
        { error: "Request not found or already reviewed" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (parsed.data.action === "reject") {
      await db
        .update(updateRequests)
        .set({
          status: "rejected",
          reviewedAt: now,
          adminNote: parsed.data.adminNote || null,
        })
        .where(eq(updateRequests.id, parsed.data.requestId));
      return NextResponse.json({ success: true });
    }

    // Approve: apply the requested changes
    const requestData = JSON.parse(req[0].requestData);

    if (req[0].requestType === "tenant_info") {
      const updateData: Record<string, unknown> = {};
      if (requestData.ownerName !== undefined) updateData.ownerName = requestData.ownerName;
      if (requestData.isRented !== undefined) updateData.isRented = requestData.isRented ? 1 : 0;
      if (requestData.tenantName !== undefined) updateData.tenantName = requestData.tenantName;
      if (requestData.tenantPhone) {
        const { encrypted, iv, tag } = encryptText(requestData.tenantPhone);
        updateData.tenantPhoneEncrypted = encrypted;
        updateData.tenantPhoneIv = iv;
        updateData.tenantPhoneTag = tag;
      }
      // Clear tenant fields if not rented
      if (requestData.isRented === false) {
        updateData.tenantName = null;
        updateData.tenantPhoneEncrypted = null;
        updateData.tenantPhoneIv = null;
        updateData.tenantPhoneTag = null;
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(flats).set(updateData).where(eq(flats.id, req[0].flatId));
      }
    } else if (req[0].requestType === "amount") {
      if (requestData.scope === "this_month") {
        const openMonth = await db
          .select()
          .from(months)
          .where(eq(months.status, "open"))
          .limit(1);
        if (openMonth[0]) {
          await db
            .insert(amountOverrides)
            .values({
              flatId: req[0].flatId,
              monthId: openMonth[0].id,
              amount: requestData.amount,
            })
            .onConflictDoUpdate({
              target: [amountOverrides.flatId, amountOverrides.monthId],
              set: { amount: requestData.amount },
            });
        }
      } else {
        await db
          .update(flats)
          .set({ maintenanceAmount: requestData.amount })
          .where(eq(flats.id, req[0].flatId));
      }
    }

    await db
      .update(updateRequests)
      .set({
        status: "approved",
        reviewedAt: now,
        adminNote: parsed.data.adminNote || null,
      })
      .where(eq(updateRequests.id, parsed.data.requestId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
