import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      createdById: true,
    },
  });
  return NextResponse.json({ admins });
}

const PostBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(6).max(128),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already used" },
      { status: 409 },
    );
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await prisma.admin.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      createdById: session.adminId,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ admin });
}
