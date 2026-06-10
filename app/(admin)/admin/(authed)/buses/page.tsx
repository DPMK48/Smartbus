import { prisma } from "@/lib/db";
import { activeReservationCountForBus } from "@/lib/float";
import BusesClient from "./BusesClient";

export const dynamic = "force-dynamic";

export default async function BusesPage() {
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
        },
      },
    },
  });

  const enriched = await Promise.all(
    buses.map(async (b) => ({
      id: b.id,
      label: b.label,
      journey: b.journey,
      fareKobo: b.fareKobo,
      totalSeats: b.totalSeats,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      departedAt: b.departedAt?.toISOString() ?? null,
      occupancy: await activeReservationCountForBus(prisma, b.id),
      reservations: b.reservations.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        purchasedAt: r.purchasedAt?.toISOString() ?? null,
        scannedAt: r.scannedAt?.toISOString() ?? null,
      })),
    })),
  );

  return <BusesClient initialBuses={enriched} />;
}
