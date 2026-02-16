import { NextResponse } from "next/server";
import { db } from "@/db";
import { flats, config } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/hash";
import { createToken, setTokenCookie } from "@/lib/auth";
import { checkRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { role, flatNumber, pin, password } = parsed.data;

    // Rate limiting
    const identifier =
      role === "resident" ? `flat:${flatNumber}` : role;
    const allowed = await checkRateLimit(identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in 30 minutes." },
        { status: 429 }
      );
    }

    let token: string;

    if (role === "resident") {
      if (!flatNumber || !pin) {
        return NextResponse.json(
          { error: "Flat number and PIN are required" },
          { status: 400 }
        );
      }

      const flat = await db
        .select()
        .from(flats)
        .where(eq(flats.flatNumber, flatNumber))
        .limit(1);

      if (!flat[0]) {
        await recordLoginAttempt(identifier, false);
        return NextResponse.json(
          { error: "Invalid flat number or PIN" },
          { status: 401 }
        );
      }

      const valid = await verifyPassword(pin, flat[0].pinHash);
      if (!valid) {
        await recordLoginAttempt(identifier, false);
        return NextResponse.json(
          { error: "Invalid flat number or PIN" },
          { status: 401 }
        );
      }

      await recordLoginAttempt(identifier, true);
      token = await createToken({
        role: "resident",
        flatId: flat[0].id,
        flatNumber: flat[0].flatNumber,
      });
    } else if (role === "security") {
      if (!pin) {
        return NextResponse.json(
          { error: "PIN is required" },
          { status: 400 }
        );
      }

      const configRow = await db
        .select()
        .from(config)
        .where(eq(config.key, "security_pin_hash"))
        .limit(1);

      if (!configRow[0]) {
        return NextResponse.json(
          { error: "Security not configured" },
          { status: 500 }
        );
      }

      const valid = await verifyPassword(pin, configRow[0].value);
      if (!valid) {
        await recordLoginAttempt(identifier, false);
        return NextResponse.json(
          { error: "Invalid PIN" },
          { status: 401 }
        );
      }

      await recordLoginAttempt(identifier, true);
      token = await createToken({ role: "security" });
    } else if (role === "admin") {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required" },
          { status: 400 }
        );
      }

      const configRow = await db
        .select()
        .from(config)
        .where(eq(config.key, "admin_password_hash"))
        .limit(1);

      if (!configRow[0]) {
        return NextResponse.json(
          { error: "Admin not configured" },
          { status: 500 }
        );
      }

      const valid = await verifyPassword(password, configRow[0].value);
      if (!valid) {
        await recordLoginAttempt(identifier, false);
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }

      await recordLoginAttempt(identifier, true);
      token = await createToken({ role: "admin" });
    } else {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const cookie = setTokenCookie(token);
    const response = NextResponse.json({
      success: true,
      role,
      ...(role === "resident" ? { flatNumber } : {}),
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, unknown>);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
