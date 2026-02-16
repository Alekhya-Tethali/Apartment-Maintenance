import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";
import { encryptText, decryptText } from "@/lib/crypto";
import { updateFlatSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allFlats = await db.select().from(flats).orderBy(flats.flatNumber);

    // Only admin sees phone info
    const result = allFlats.map((f) => ({
      id: f.id,
      flatNumber: f.flatNumber,
      maintenanceAmount: f.maintenanceAmount,
      hasPhone: !!f.phoneEncrypted,
      ...(session.role === "admin" && f.phoneEncrypted
        ? {
            phone: decryptText(f.phoneEncrypted, f.phoneIv!, f.phoneTag!),
          }
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
    const { flatId, ...updates } = body;

    if (!flatId) {
      return NextResponse.json({ error: "Flat ID required" }, { status: 400 });
    }

    const parsed = updateFlatSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.maintenanceAmount !== undefined) {
      updateData.maintenanceAmount = parsed.data.maintenanceAmount;
    }

    if (parsed.data.pin) {
      updateData.pinHash = await hashPassword(parsed.data.pin);
    }

    if (parsed.data.phone) {
      const { encrypted, iv, tag } = encryptText(parsed.data.phone);
      updateData.phoneEncrypted = encrypted;
      updateData.phoneIv = iv;
      updateData.phoneTag = tag;
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
