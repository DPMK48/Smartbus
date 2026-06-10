import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const reservations = await prisma.reservation.findMany({
    where: {
      studentEmail: email,
      status: { in: ["PAID", "USED"] },
      purchasedAt: { gte: since },
    },
    orderBy: { purchasedAt: "desc" },
    include: { bus: true },
  });

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      reference: r.paystackRef,
      busLabel: r.bus.label,
      amount: r.amount,
      status: r.status,
      qrToken: r.qrToken,
      scannedAt: r.scannedAt,
      purchasedAt: r.purchasedAt,
      expiresAt: r.expiresAt,
    })),
  });
}
