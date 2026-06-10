import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export type AdminSession = {
  adminId: string;
  email: string;
  name: string;
  /** Issued-at timestamp in ms — used for the 4h expiry. */
  iat: number;
};

const COOKIE_NAME = "atbu_bus_admin";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

function getSecret(): string {
  const s = process.env.IRON_SESSION_PASSWORD;
  if (!s || s.length < 32) {
    throw new Error("IRON_SESSION_PASSWORD must be at least 32 characters");
  }
  return s;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

/** Encode `{adminId, email, name, iat}` → `base64url(json).hmac`. */
export function encodeSession(session: AdminSession): string {
  const json = JSON.stringify(session);
  const body = Buffer.from(json, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Decode + verify. Returns null on tamper, expiry, or malformed input. */
export function decodeSession(raw: string | undefined): AdminSession | null {
  if (!raw) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  // timingSafeEqual requires equal-length buffers; bail if not.
  if (mac.length !== expected.length) return null;
  if (
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as AdminSession;
    if (
      typeof session.adminId !== "string" ||
      typeof session.iat !== "number"
    ) {
      return null;
    }
    const ageMs = Date.now() - session.iat;
    if (ageMs < 0 || ageMs > MAX_AGE_SECONDS * 1000) return null;
    return session;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookies (server components, route handlers). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const c = await cookies();
  return decodeSession(c.get(COOKIE_NAME)?.value);
}

/** Set the session cookie on a response. Use in API route handlers. */
export function setSessionCookie(
  res: NextResponse,
  session: AdminSession,
): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: encodeSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
