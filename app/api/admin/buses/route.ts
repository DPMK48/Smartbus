import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { activeReservationCountForBus } from "@/lib/float";

/**
 * GET /api/admin/buses — admin view of all buses (any status) with rich
 * reservation breakdown.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buses = await prisma.bus.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      reservations: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          status: true,
          createdAt: true,
          purchasedAt: true,
          scannedAt: true,
          paystackRef: true,
          expiresAt: true,
        },
      },
    },
  });

  const enriched = await Promise.all(
    buses.map(async (b) => {
      const occupancy = await activeReservationCountForBus(prisma, b.id);
      return {
        ...b,
        occupancy,
        availableSeats: Math.max(0, b.totalSeats - occupancy),
      };
    }),
  );

  return NextResponse.json({ buses: enriched });
}
