import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD not set." }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  await createSessionCookie({ sub: "admin", role: "admin" });
  return NextResponse.json({ ok: true });
}
