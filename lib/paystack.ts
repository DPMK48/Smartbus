import crypto from "crypto";

const USE_STUB =
  process.env.USE_PAYSTACK_STUB === "true" || !process.env.PAYSTACK_SECRET_KEY;

const APP_BASE_URL =
  process.env.APP_BASE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

export type PaystackInitResult = {
  reference: string;
  authorizationUrl: string;
};

/**
 * Initialize a Paystack transaction. In stub mode this returns a local
 * /mock/paystack URL that simulates the Paystack hosted checkout — clicking
 * "pay" on that page hits our own webhook with a synthetic signature.
 */
export async function initializePaystackTransaction(args: {
  email: string;
  amountKobo: number;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResult> {
  const reference = `atbu_${Date.now()}_${crypto
    .randomBytes(6)
    .toString("hex")}`;

  if (USE_STUB) {
    const authorizationUrl = `${APP_BASE_URL}/mock/paystack?reference=${encodeURIComponent(
      reference,
    )}&amount=${args.amountKobo}&email=${encodeURIComponent(args.email)}`;
    return { reference, authorizationUrl };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo,
      reference,
      callback_url: `${APP_BASE_URL}/payment/return`,
      metadata: args.metadata,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Paystack init failed: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as {
    status: boolean;
    data: { authorization_url: string; reference: string };
  };

  return {
    reference: json.data.reference,
    authorizationUrl: json.data.authorization_url,
  };
}

/**
 * Verify a transaction by reference (defense-in-depth on the return page).
 * In stub mode, we trust the reference exists in our DB as PAID after the
 * mock webhook fires.
 */
export async function verifyPaystackTransaction(reference: string): Promise<{
  ok: boolean;
  amountKobo?: number;
}> {
  if (USE_STUB) {
    // Stub: trust the caller; the webhook is the source of truth in this mode.
    return { ok: true };
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      reference,
    )}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    },
  );

  if (!res.ok) return { ok: false };
  const json = (await res.json()) as {
    status: boolean;
    data: { status: string; amount: number };
  };
  return {
    ok: json.status && json.data.status === "success",
    amountKobo: json.data.amount,
  };
}

/**
 * Verify Paystack's webhook signature (HMAC SHA-512 of raw body using secret).
 * Returns true in stub mode if a known stub header is present.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (USE_STUB) {
    // The mock page signs with this header so the same webhook handler works.
    return signatureHeader === "stub";
  }
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) return false;
  const computed = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signatureHeader),
  );
}

export const isStubMode = USE_STUB;
