import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalBuses,
    activeBuses,
    fullBuses,
    departedBuses,
    paidReservations,
    usedReservations,
    pendingReservations,
    recentScans,
  ] = await Promise.all([
    prisma.bus.count(),
    prisma.bus.count({ where: { status: "ACTIVE" } }),
    prisma.bus.count({ where: { status: "FULL" } }),
    prisma.bus.count({ where: { status: "DEPARTED" } }),
    prisma.reservation.count({ where: { status: "PAID" } }),
    prisma.reservation.count({ where: { status: "USED" } }),
    prisma.reservation.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.scanLog.findMany({
      orderBy: { scannedAt: "desc" },
      take: 10,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totals: {
      totalBuses,
      activeBuses,
      fullBuses,
      departedBuses,
      paidReservations,
      usedReservations,
      pendingReservations,
    },
    recentScans,
  });
}
