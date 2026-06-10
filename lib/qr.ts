import crypto from "crypto";
import QRCode from "qrcode";

export function generateQrToken(): string {
  // 32-byte cryptographically random URL-safe token (~43 chars).
  return crypto.randomBytes(32).toString("base64url");
}

export async function generateQrPngBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#111827",
      light: "#FFF5E6",
    },
  });
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#111827",
      light: "#FFF5E6",
    },
  });
}
