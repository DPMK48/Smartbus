import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!admin) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
  setSessionCookie(res, {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    iat: Date.now(),
  });
  return res;
}
