import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

const Body = z.object({
  qrToken: z.string().min(1),
});

type ScanResult =
  | "OK"
  | "INVALID"
  | "ALREADY_USED"
  | "EXPIRED"
  | "NOT_PAID"
  | "BUS_DEPARTED";

/**
 * POST /api/scan
 * Admin-only. Validates a scanned QR token. Marks the reservation USED on
 * success. Always writes an audit row to ScanLog regardless of outcome.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const adminId = session.adminId;
  const qrToken = parsed.data.qrToken.trim();

  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { qrToken },
      include: { bus: true },
    });

    if (!reservation) {
      await tx.scanLog.create({
        data: { qrTokenTried: qrToken, result: "INVALID", adminId },
      });
      return { ok: false, result: "INVALID" as ScanResult };
    }

    if (reservation.status === "USED") {
      await tx.scanLog.create({
        data: {
          qrTokenTried: qrToken,
          reservationId: reservation.id,
          result: "ALREADY_USED",
          adminId,
        },
      });
      return {
        ok: false,
        result: "ALREADY_USED" as ScanResult,
        reservation: simplify(reservation),
      };
    }

    if (reservation.status !== "PAID") {
      await tx.scanLog.create({
        data: {
          qrTokenTried: qrToken,
          reservationId: reservation.id,
          result: "NOT_PAID",
          adminId,
        },
      });
      return {
        ok: false,
        result: "NOT_PAID" as ScanResult,
        reservation: simplify(reservation),
      };
    }

    const now = new Date();
    if (reservation.expiresAt && reservation.expiresAt < now) {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "EXPIRED" },
      });
      await tx.scanLog.create({
        data: {
          qrTokenTried: qrToken,
          reservationId: reservation.id,
          result: "EXPIRED",
          adminId,
        },
      });
      return {
        ok: false,
        result: "EXPIRED" as ScanResult,
        reservation: simplify(reservation),
      };
    }

    if (reservation.bus.status === "DEPARTED") {
      await tx.scanLog.create({
        data: {
          qrTokenTried: qrToken,
          reservationId: reservation.id,
          result: "BUS_DEPARTED",
          adminId,
        },
      });
      return {
        ok: false,
        result: "BUS_DEPARTED" as ScanResult,
        reservation: simplify(reservation),
      };
    }

    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "USED", scannedAt: now, scannedByAdminId: adminId },
    });
    await tx.scanLog.create({
      data: {
        qrTokenTried: qrToken,
        reservationId: reservation.id,
        result: "OK",
        adminId,
      },
    });
    return {
      ok: true,
      result: "OK" as ScanResult,
      reservation: simplify(reservation),
    };
  });

  return NextResponse.json(result);
}

function simplify(r: {
  id: string;
  studentName: string;
  studentEmail: string;
  bus: { label: string };
}) {
  return {
    id: r.id,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    busLabel: r.bus.label,
  };
}
