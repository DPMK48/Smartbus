import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { activeReservationCountForBus } from "@/lib/float";
import ReserveForm from "./ReserveForm";

export const dynamic = "force-dynamic";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ busId: string }>;
}) {
  const { busId } = await params;
  const bus = await prisma.bus.findUnique({ where: { id: busId } });
  if (!bus || bus.status !== "ACTIVE") notFound();

  const oldest = await prisma.bus.findFirst({
    where: { status: "ACTIVE", journey: bus.journey },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const occupancy = await activeReservationCountForBus(prisma, busId);

  const fareSetting = await prisma.setting.findUnique({
    where: { key: "fareKobo" },
  });
  const defaultFareKobo = Number(fareSetting?.value ?? 60000);
  const fareKobo = bus.fareKobo ?? defaultFareKobo;
  const isSpecial = bus.fareKobo !== null && bus.fareKobo !== defaultFareKobo;

  const isOldest = oldest?.id === busId;
  const hasSeats = occupancy < bus.totalSeats;
  const canBook = (isSpecial || isOldest) && hasSeats;

  return (
    <ReserveForm
      bus={{
        id: bus.id,
        label: bus.label,
        totalSeats: bus.totalSeats,
        availableSeats: Math.max(0, bus.totalSeats - occupancy),
      }}
      fareKobo={fareKobo}
      canReserve={canBook}
      reason={
        !canBook
          ? isSpecial
            ? "This special bus is not available right now."
            : "Only the next bus in this journey can be reserved."
          : !hasSeats
            ? "This bus just sold out."
            : ""
      }
    />
  );
}
