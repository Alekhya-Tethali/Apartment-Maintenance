import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats, amountOverrides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";
import { encryptText, decryptText } from "@/lib/crypto";
import { updateFlatSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const monthId = searchParams.get("monthId");

    const allFlats = await db.select().from(flats).orderBy(flats.flatNumber);

    // If monthId provided, get per-month amount overrides
    let overrideMap: Map<number, number> | null = null;
    if (monthId) {
      const overrides = await db
        .select()
        .from(amountOverrides)
        .where(eq(amountOverrides.monthId, parseInt(monthId)));
      overrideMap = new Map(overrides.map((o) => [o.flatId, o.amount]));
    }

    const result = allFlats.map((f) => ({
      id: f.id,
      flatNumber: f.flatNumber,
      maintenanceAmount: overrideMap?.get(f.id) ?? f.maintenanceAmount,
      ownerName: f.ownerName || null,
      isRented: !!f.isRented,
      tenantName: f.tenantName || null,
      hasOwnerPhone: !!f.ownerPhoneEncrypted,
      hasTenantPhone: !!f.tenantPhoneEncrypted,
      ...(session.role === "admin" && f.ownerPhoneEncrypted
        ? { ownerPhone: decryptText(f.ownerPhoneEncrypted, f.ownerPhoneIv!, f.ownerPhoneTag!) }
        : {}),
      ...(session.role === "admin" && f.tenantPhoneEncrypted
        ? { tenantPhone: decryptText(f.tenantPhoneEncrypted, f.tenantPhoneIv!, f.tenantPhoneTag!) }
        : {}),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Flats list error:", error);
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
    const { flatId, amountScope, ...updates } = body;

    if (!flatId) {
      return NextResponse.json({ error: "Flat ID required" }, { status: 400 });
    }

    const parsed = updateFlatSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Handle maintenance amount with scope
    if (parsed.data.maintenanceAmount !== undefined) {
      if (amountScope === "this_month") {
        // Import months inline to avoid circular deps
        const { months } = await import("@/db/schema");
        const openMonth = await db
          .select()
          .from(months)
          .where(eq(months.status, "open"))
          .limit(1);
        if (openMonth[0]) {
          await db
            .insert(amountOverrides)
            .values({
              flatId,
              monthId: openMonth[0].id,
              amount: parsed.data.maintenanceAmount,
            })
            .onConflictDoUpdate({
              target: [amountOverrides.flatId, amountOverrides.monthId],
              set: { amount: parsed.data.maintenanceAmount },
            });
        }
      } else {
        updateData.maintenanceAmount = parsed.data.maintenanceAmount;
      }
    }

    if (parsed.data.pin) {
      updateData.pinHash = await hashPassword(parsed.data.pin);
    }

    // Owner phone
    if (parsed.data.phone) {
      const { encrypted, iv, tag } = encryptText(parsed.data.phone);
      updateData.ownerPhoneEncrypted = encrypted;
      updateData.ownerPhoneIv = iv;
      updateData.ownerPhoneTag = tag;
    }

    if (parsed.data.ownerName !== undefined) {
      updateData.ownerName = parsed.data.ownerName || null;
    }

    if (parsed.data.isRented !== undefined) {
      updateData.isRented = parsed.data.isRented ? 1 : 0;
      // Clear tenant fields when unchecking rent
      if (!parsed.data.isRented) {
        updateData.tenantName = null;
        updateData.tenantPhoneEncrypted = null;
        updateData.tenantPhoneIv = null;
        updateData.tenantPhoneTag = null;
      }
    }

    if (parsed.data.tenantName !== undefined) {
      updateData.tenantName = parsed.data.tenantName || null;
    }

    if (parsed.data.tenantPhone) {
      const { encrypted, iv, tag } = encryptText(parsed.data.tenantPhone);
      updateData.tenantPhoneEncrypted = encrypted;
      updateData.tenantPhoneIv = iv;
      updateData.tenantPhoneTag = tag;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(flats).set(updateData).where(eq(flats.id, flatId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update flat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
