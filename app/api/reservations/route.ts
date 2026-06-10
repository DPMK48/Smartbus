import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { initializePaystackTransaction } from "@/lib/paystack";
import { activeReservationCountForBus } from "@/lib/float";

const Body = z.object({
  busId: z.string().min(1),
  studentName: z.string().min(2).max(80),
  studentEmail: z.string().email(),
});

/**
 * POST /api/reservations
 * Atomically:
 *   1. Lock the bus row (SELECT FOR UPDATE).
 *   2. Verify it's still the oldest ACTIVE bus and has free seats.
 *   3. Insert reservation as PENDING_PAYMENT (pre-decrements available seats).
 *   4. If now full, mark bus FULL.
 *   5. Initialize Paystack transaction.
 *   6. Return { authorizationUrl, reference } so client can redirect.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { busId, studentName, studentEmail } = parsed.data;

  // Get current fare.
  const fareSetting = await prisma.setting.findUnique({
    where: { key: "fareKobo" },
  });
  const defaultFareKobo = Number(fareSetting?.value ?? 60000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the bus row to prevent race on the last seat.
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          total_seats: number;
          status: string;
          created_at: Date;
          journey: string;
          fare_kobo: number | null;
        }>
      >`SELECT id, "totalSeats" AS total_seats, status::text AS status, "createdAt" AS created_at, journey::text AS journey, "fareKobo" AS fare_kobo
        FROM "Bus" WHERE id = ${busId} FOR UPDATE`;
      const locked = lockedRows[0];
      if (!locked) {
        throw new Response("Bus not found", { status: 404 });
      }
      if (locked.status !== "ACTIVE") {
        throw new Response("Bus is not accepting reservations", {
          status: 409,
        });
      }

      const journey = locked.journey as "YELWA_TO_GUBI" | "GUBI_TO_YELWA";

      // Confirm it's the oldest ACTIVE (queue rule).
      const isSpecial =
        locked.fare_kobo !== null && locked.fare_kobo !== defaultFareKobo;
      if (!isSpecial) {
        const oldestActive = await tx.bus.findFirst({
          where: { status: "ACTIVE", journey },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (oldestActive?.id !== busId) {
          throw new Response(
            "Only the next bus in queue can be booked",
            { status: 409 },
          );
        }
      }

      const occupancy = await activeReservationCountForBus(tx, busId);
      if (occupancy >= locked.total_seats) {
        throw new Response("Bus is full", { status: 409 });
      }

      const amountKobo = locked.fare_kobo ?? defaultFareKobo;

      // Init Paystack to get reference.
      const paystack = await initializePaystackTransaction({
        email: studentEmail.toLowerCase(),
        amountKobo,
        metadata: { busId, studentName },
      });

      const reservation = await tx.reservation.create({
        data: {
          busId,
          studentName,
          studentEmail: studentEmail.toLowerCase(),
          amount: amountKobo,
          paystackRef: paystack.reference,
          status: "PENDING_PAYMENT",
        },
      });

      // If this pending reservation fills the bus, mark FULL.
      if (occupancy + 1 >= locked.total_seats) {
        await tx.bus.update({
          where: { id: busId },
          data: { status: "FULL" },
        });
      }

      return {
        reservationId: reservation.id,
        reference: paystack.reference,
        authorizationUrl: paystack.authorizationUrl,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text();
      return NextResponse.json(
        { error: text || "Failed" },
        { status: err.status },
      );
    }
    console.error("Reservation create failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
