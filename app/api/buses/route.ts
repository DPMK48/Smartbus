import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import {
  activeReservationCountForBus,
  sweepDepartedReservationsForward,
} from "@/lib/float";

/**
 * GET /api/buses — public list of buses visible to students.
 * Returns only ACTIVE buses, ordered by creation (queue). Each includes
 * availableSeats and a `selectable` flag (oldest ACTIVE per journey).
 */
export async function GET() {
  const fareSetting = await prisma.setting.findUnique({
    where: { key: "fareKobo" },
  });
  const defaultFareKobo = Number(fareSetting?.value ?? 60000);
  const buses = await prisma.bus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const firstByJourney = new Map<string, string>();
  for (const bus of buses) {
    if (!firstByJourney.has(bus.journey)) {
      firstByJourney.set(bus.journey, bus.id);
    }
  }

  const enriched = await Promise.all(
    buses.map(async (b) => {
      const occupancy = await activeReservationCountForBus(prisma, b.id);
      const availableSeats = Math.max(0, b.totalSeats - occupancy);
      const isSpecial =
        b.fareKobo !== null && b.fareKobo !== defaultFareKobo;
      return {
        id: b.id,
        label: b.label,
        journey: b.journey,
        totalSeats: b.totalSeats,
        availableSeats,
        createdAt: b.createdAt.toISOString(),
        selectable:
          availableSeats > 0 &&
          (isSpecial || firstByJourney.get(b.journey) === b.id),
      };
    }),
  );

  return NextResponse.json({ buses: enriched });
}

const PostBody = z.object({
  label: z.string().min(1).max(40),
  totalSeats: z.number().int().min(1).max(200),
  journey: z.enum(["YELWA_TO_GUBI", "GUBI_TO_YELWA"]),
  fareKobo: z.number().int().min(100).max(200000).optional(),
});

/**
 * POST /api/buses — admin adds a bus. Triggers a sweep that may pull
 * stranded reservations from DEPARTED buses forward into this new one.
 */
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

  const bus = await prisma.$transaction(async (tx) => {
    const created = await tx.bus.create({
      data: {
        label: parsed.data.label,
        totalSeats: parsed.data.totalSeats,
        journey: parsed.data.journey,
        fareKobo: parsed.data.fareKobo ?? null,
      },
    });
    await sweepDepartedReservationsForward(tx);
    return created;
  });

  return NextResponse.json({ bus });
}
