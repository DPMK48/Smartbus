import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

const Body = z.object({ reference: z.string().min(1) });

/**
 * Called by /payment/return to check if a transaction landed. The webhook is
 * the source of truth — this endpoint only verifies + reports current status.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { paystackRef: parsed.data.reference },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (reservation.status === "PAID" || reservation.status === "USED") {
    return NextResponse.json({
      status: reservation.status,
      studentEmail: reservation.studentEmail,
    });
  }

  // Fall back to a verify call (useful in live mode if webhook is delayed).
  const v = await verifyPaystackTransaction(parsed.data.reference);
  return NextResponse.json({
    status: v.ok ? "PAID_PENDING_WEBHOOK" : reservation.status,
    studentEmail: reservation.studentEmail,
  });
}
