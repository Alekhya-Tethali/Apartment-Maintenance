import { NextResponse } from "next/server";
import { db } from "@/db";
import { updateRequests, flats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createRequestSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "security")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await db
      .select({
        id: updateRequests.id,
        flatId: updateRequests.flatId,
        flatNumber: flats.flatNumber,
        requestType: updateRequests.requestType,
        requestData: updateRequests.requestData,
        status: updateRequests.status,
        requestedBy: updateRequests.requestedBy,
        requestedAt: updateRequests.requestedAt,
        reviewedAt: updateRequests.reviewedAt,
        adminNote: updateRequests.adminNote,
      })
      .from(updateRequests)
      .innerJoin(flats, eq(updateRequests.flatId, flats.id))
      .orderBy(desc(updateRequests.requestedAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "security") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Verify flat exists
    const flat = await db
      .select()
      .from(flats)
      .where(eq(flats.id, parsed.data.flatId))
      .limit(1);
    if (!flat[0]) {
      return NextResponse.json({ error: "Flat not found" }, { status: 404 });
    }

    const [req] = await db
      .insert(updateRequests)
      .values({
        flatId: parsed.data.flatId,
        requestType: parsed.data.requestType,
        requestData: parsed.data.requestData,
        requestedBy: "security",
      })
      .returning();

    return NextResponse.json(req, { status: 201 });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
