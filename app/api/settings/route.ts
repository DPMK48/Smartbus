import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const fare = await prisma.setting.findUnique({ where: { key: "fareKobo" } });
  return NextResponse.json({ fareKobo: Number(fare?.value ?? 60000) });
}

const PutBody = z.object({
  fareKobo: z.number().int().min(0).max(1_000_000),
});

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = PutBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key: "fareKobo" },
    update: { value: String(parsed.data.fareKobo) },
    create: { key: "fareKobo", value: String(parsed.data.fareKobo) },
  });
  return NextResponse.json({ ok: true, fareKobo: parsed.data.fareKobo });
}
