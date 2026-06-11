import { Prisma, type PrismaClient } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type FloatOutcome = {
  reservationId: string;
  outcome: "FLOATED" | "EXPIRED" | "NO_NEXT_BUS";
  newBusId?: string;
};

/**
 * Move a list of reservations forward to the next ACTIVE bus with capacity.
 * Runs inside an existing transaction. Caller is responsible for the tx.
 *
 * Rules:
 *  - If reservation.expiresAt < now → mark EXPIRED, don't float.
 *  - Next bus = oldest ACTIVE bus where createdAt > fromBus.createdAt with free seats.
 *  - On float: reservation.busId updated, floatHistory appended.
 *  - If target bus reaches capacity, mark it FULL.
 *  - If no eligible next bus → leave reservation in place (kept as PAID);
 *    the bus-creation sweep will retry later.
 */
export async function floatReservations(
  tx: Tx,
  fromBusId: string,
  reservationIds: string[],
): Promise<FloatOutcome[]> {
  if (reservationIds.length === 0) return [];

  const fromBus = await tx.bus.findUnique({ where: { id: fromBusId } });
  if (!fromBus) throw new Error(`Bus not found: ${fromBusId}`);

  const now = new Date();
  const outcomes: FloatOutcome[] = [];

  for (const rid of reservationIds) {
    const reservation = await tx.reservation.findUnique({ where: { id: rid } });
    if (!reservation) continue;

    // Expired? mark EXPIRED.
    if (reservation.expiresAt && reservation.expiresAt < now) {
      await tx.reservation.update({
        where: { id: rid },
        data: { status: "EXPIRED" },
      });
      outcomes.push({ reservationId: rid, outcome: "EXPIRED" });
      continue;
    }

    // Find next ACTIVE bus in the same journey uploaded after fromBus.
    const nextBus = await findNextAvailableBus(
      tx,
      fromBus.createdAt,
      fromBus.journey,
    );
    if (!nextBus) {
      outcomes.push({ reservationId: rid, outcome: "NO_NEXT_BUS" });
      continue;
    }

    const history = Array.isArray(reservation.floatHistory)
      ? (reservation.floatHistory as unknown as Array<Record<string, unknown>>)
      : [];

    history.push({
      fromBusId: reservation.busId,
      toBusId: nextBus.id,
      at: now.toISOString(),
    });

    await tx.reservation.update({
      where: { id: rid },
      data: {
        busId: nextBus.id,
        floatHistory: history as unknown as Prisma.InputJsonValue,
      },
    });

    // If nextBus is now at capacity, mark FULL.
    const occupancy = await activeReservationCountForBus(tx, nextBus.id);
    if (occupancy >= nextBus.totalSeats) {
      await tx.bus.update({
        where: { id: nextBus.id },
        data: { status: "FULL" },
      });
    }

    outcomes.push({
      reservationId: rid,
      outcome: "FLOATED",
      newBusId: nextBus.id,
    });
  }

  return outcomes;
}

/**
 * Sweep PAID, unscanned, unexpired reservations whose CURRENT bus is DEPARTED
 * and try to move them into the newly-created bus (or any ACTIVE bus newer
 * than their current bus).
 *
 * Called when a new bus is uploaded — gives "stranded" passengers (whose
 * float-on-departure failed because no next bus existed) another chance.
 */
export async function sweepDepartedReservationsForward(tx: Tx): Promise<void> {
  const now = new Date();

  const stranded = await tx.reservation.findMany({
    where: {
      status: "PAID",
      scannedAt: null,
      expiresAt: { gt: now },
      bus: { status: "DEPARTED" },
    },
    include: { bus: true },
    orderBy: { createdAt: "asc" },
  });

  for (const r of stranded) {
    const nextBus = await findNextAvailableBus(
      tx,
      r.bus.createdAt,
      r.bus.journey,
    );
    if (!nextBus) continue;

    const history = Array.isArray(r.floatHistory)
      ? (r.floatHistory as unknown as Array<Record<string, unknown>>)
      : [];
    history.push({
      fromBusId: r.busId,
      toBusId: nextBus.id,
      at: now.toISOString(),
      reason: "sweep",
    });

    await tx.reservation.update({
      where: { id: r.id },
      data: {
        busId: nextBus.id,
        floatHistory: history as unknown as Prisma.InputJsonValue,
      },
    });

    const occupancy = await activeReservationCountForBus(tx, nextBus.id);
    if (occupancy >= nextBus.totalSeats) {
      await tx.bus.update({
        where: { id: nextBus.id },
        data: { status: "FULL" },
      });
    }
  }
}

export async function activeReservationCountForBus(
  tx: Tx,
  busId: string,
): Promise<number> {
  return tx.reservation.count({
    where: {
      busId,
      status: { in: ["PENDING_PAYMENT", "PAID"] },
    },
  });
}

async function findNextAvailableBus(
  tx: Tx,
  afterCreatedAt: Date,
  journey: string,
) {
  const candidates = await tx.bus.findMany({
    where: {
      journey,
      status: "ACTIVE",
      createdAt: { gt: afterCreatedAt },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const bus of candidates) {
    const occupancy = await activeReservationCountForBus(tx, bus.id);
    if (occupancy < bus.totalSeats) return bus;
  }
  return null;
}

/**
 * Recompute a bus's status based on current occupancy. Used after mark-absent
 * (which floats reservations OUT, possibly returning bus to ACTIVE) or after
 * payment cancellation (which frees a pre-decremented seat).
 */
export async function recomputeBusStatus(tx: Tx, busId: string): Promise<void> {
  const bus = await tx.bus.findUnique({ where: { id: busId } });
  if (!bus || bus.status === "DEPARTED") return;
  const occupancy = await activeReservationCountForBus(tx, busId);
  const newStatus = occupancy >= bus.totalSeats ? "FULL" : "ACTIVE";
  if (newStatus !== bus.status) {
    await tx.bus.update({ where: { id: busId }, data: { status: newStatus } });
  }
}
