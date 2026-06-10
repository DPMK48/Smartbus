import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paystack";
import { generateQrToken, generateQrPngBuffer } from "@/lib/qr";
import { sendQrEmail } from "@/lib/email";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/paystack/webhook
 *
 * Receives Paystack server-to-server callbacks (or the mock checkout's
 * synthetic call). On `charge.success`, marks the reservation PAID, issues
 * a QR token, sends the email. Idempotent on paystackRef.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  let event: { event: string; data: { reference: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const reference = event.data.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Idempotent state transition.
  const { reservation, alreadyPaid } = await prisma.$transaction(
    async (tx) => {
      const r = await tx.reservation.findUnique({
        where: { paystackRef: reference },
        include: { bus: true },
      });
      if (!r) throw new Response("Reservation not found", { status: 404 });

      if (r.status === "PAID" || r.status === "USED") {
        return { reservation: r, alreadyPaid: true };
      }
      if (r.status === "CANCELED" || r.status === "EXPIRED") {
        throw new Response(`Cannot pay a ${r.status} reservation`, {
          status: 409,
        });
      }

      const now = new Date();
      const qrToken = generateQrToken();

      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: {
          status: "PAID",
          qrToken,
          purchasedAt: now,
          expiresAt: new Date(now.getTime() + TWENTY_FOUR_HOURS_MS),
        },
        include: { bus: true },
      });
      return { reservation: updated, alreadyPaid: false };
    },
  );

  if (alreadyPaid) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // Generate + send email outside the transaction.
  try {
    const pngBuffer = await generateQrPngBuffer(reservation.qrToken!);
    await sendQrEmail({
      to: reservation.studentEmail,
      studentName: reservation.studentName,
      busLabel: reservation.bus.label,
      amountKobo: reservation.amount,
      reference: reservation.paystackRef,
      qrToken: reservation.qrToken!,
      qrPngBuffer: pngBuffer,
      expiresAt: reservation.expiresAt!,
    });
  } catch (err) {
    console.error("Failed to send QR email — reservation still PAID:", err);
  }

  return NextResponse.json({ ok: true });
}
