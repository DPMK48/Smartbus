import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { floatReservations, recomputeBusStatus } from "@/lib/float";

const PatchBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("depart") }),
  z.object({
    action: z.literal("markAbsent"),
    reservationIds: z.array(z.string()).min(1),
  }),
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const bus = await prisma.bus.findUnique({
    where: { id },
    include: {
      reservations: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!bus) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ bus });
}

/**
 * PATCH — admin actions on a bus.
 *  - depart: mark DEPARTED + float unscanned PAID reservations forward.
 *  - markAbsent: float specific reservations forward; if bus was FULL it
 *    returns to ACTIVE so the freed seats reappear in student list.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const bus = await tx.bus.findUnique({ where: { id } });
    if (!bus) throw new Response("Not found", { status: 404 });
    if (bus.status === "DEPARTED") {
      throw new Response("Bus already departed", { status: 409 });
    }

    if (parsed.data.action === "depart") {
      const unscanned = await tx.reservation.findMany({
        where: {
          busId: id,
          status: "PAID",
          scannedAt: null,
        },
        select: { id: true },
      });
      await tx.bus.update({
        where: { id },
        data: { status: "DEPARTED", departedAt: new Date() },
      });
      const outcomes = await floatReservations(
        tx,
        id,
        unscanned.map((r) => r.id),
      );
      return { action: "depart", floated: outcomes };
    }

    // markAbsent
    const valid = await tx.reservation.findMany({
      where: {
        id: { in: parsed.data.reservationIds },
        busId: id,
        status: "PAID",
        scannedAt: null,
      },
      select: { id: true },
    });
    const outcomes = await floatReservations(
      tx,
      id,
      valid.map((r) => r.id),
    );
    // After floating out, recompute bus status — may return to ACTIVE.
    await recomputeBusStatus(tx, id);
    return { action: "markAbsent", floated: outcomes };
  });

  return NextResponse.json(result);
}

/**
 * DELETE — admin removes a bus. Behavior matches "depart": the bus is marked
 * DEPARTED (not hard-deleted, to preserve audit trail) and any unscanned PAID
 * reservations are floated forward.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await prisma.$transaction(async (tx) => {
    const bus = await tx.bus.findUnique({ where: { id } });
    if (!bus) throw new Response("Not found", { status: 404 });
    if (bus.status === "DEPARTED") return;

    const unscanned = await tx.reservation.findMany({
      where: { busId: id, status: "PAID", scannedAt: null },
      select: { id: true },
    });

    await tx.bus.update({
      where: { id },
      data: { status: "DEPARTED", departedAt: new Date() },
    });

    if (unscanned.length > 0) {
      await floatReservations(
        tx,
        id,
        unscanned.map((r) => r.id),
      );
    }
  });

  return NextResponse.json({ ok: true });
}
