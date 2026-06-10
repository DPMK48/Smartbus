import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

/**
 * GET /api/reservations/verify?reference=...
 * Used by the /payment/return page to confirm payment landed before
 * showing the success screen. Falls back to DB status (webhook is the
 * authoritative source).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { paystackRef: reference },
    include: { bus: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Defense-in-depth: ask Paystack too. In stub mode this is a no-op.
  const verify = await verifyPaystackTransaction(reference);

  return NextResponse.json({
    status: reservation.status,
    paystackOk: verify.ok,
    busLabel: reservation.bus.label,
    studentEmail: reservation.studentEmail,
    studentName: reservation.studentName,
    amount: reservation.amount,
    reference: reservation.paystackRef,
    qrToken: reservation.qrToken,
    scannedAt: reservation.scannedAt,
    expiresAt: reservation.expiresAt,
  });
}
