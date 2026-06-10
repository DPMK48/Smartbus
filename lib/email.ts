import fs from "fs/promises";
import path from "path";
import nodemailer, { type Transporter } from "nodemailer";

const USE_STUB =
  process.env.USE_EMAIL_STUB === "true" || !process.env.SMTP_HOST;

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
  return cachedTransporter;
}

export type SendQrEmailArgs = {
  to: string;
  studentName: string;
  busLabel: string;
  amountKobo: number;
  reference: string;
  qrToken: string;
  qrPngBuffer: Buffer;
  expiresAt: Date;
};

function renderHtml(args: Omit<SendQrEmailArgs, "qrPngBuffer">): string {
  const fareNgn = (args.amountKobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `<!doctype html>
<html>
<body style="margin:0;font-family:Inter,Arial,sans-serif;background:#FFF5E6;color:#111827;padding:24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(17,24,39,0.08);">
    <tr>
      <td style="background:#FAD4C0;padding:24px 32px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#111827;opacity:0.7;">ATBU Smart Bus</div>
        <h1 style="margin:8px 0 0 0;font-size:24px;color:#111827;">Your boarding pass</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 16px 0;font-size:16px;">Hello ${escapeHtml(args.studentName)},</p>
        <p style="margin:0 0 24px 0;font-size:16px;">Your campus bus seat is confirmed. Show the QR code below at boarding.</p>
        <div style="text-align:center;margin:24px 0;">
          <img src="cid:qr-code" alt="QR boarding pass" width="240" height="240" style="border-radius:12px;border:1px solid rgba(17,24,39,0.08);" />
        </div>
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:rgba(17,24,39,0.6);font-size:12px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.06em;">Bus</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:500;">${escapeHtml(args.busLabel)}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(17,24,39,0.6);font-size:12px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.06em;">Fare</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:500;">&#8358;${fareNgn}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(17,24,39,0.6);font-size:12px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.06em;">Reference</td><td style="padding:8px 0;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;">${escapeHtml(args.reference)}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(17,24,39,0.6);font-size:12px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.06em;">Valid until</td><td style="padding:8px 0;text-align:right;font-size:14px;">${args.expiresAt.toUTCString()}</td></tr>
        </table>
        <p style="margin:24px 0 0 0;font-size:13px;color:rgba(17,24,39,0.6);">
          If you don't board this bus, your seat will be transferred to the next available bus within 24 hours.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendQrEmail(args: SendQrEmailArgs): Promise<void> {
  const html = renderHtml(args);
  const subject = `Your ATBU bus boarding pass (${args.busLabel})`;

  if (USE_STUB) {
    const outDir = path.join(process.cwd(), ".dev-mail");
    await fs.mkdir(outDir, { recursive: true });
    const ts = Date.now();
    const stem = `${ts}_${args.to.replace(/[^a-z0-9]/gi, "_")}`;
    await fs.writeFile(path.join(outDir, `${stem}.html`), html, "utf8");
    await fs.writeFile(path.join(outDir, `${stem}.png`), args.qrPngBuffer);
    console.log(
      `[email stub] would send to ${args.to} — wrote ${stem}.html + .png to .dev-mail/`,
    );
    return;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: args.to,
    subject,
    html,
    attachments: [
      {
        filename: "boarding-pass.png",
        content: args.qrPngBuffer,
        contentType: "image/png",
        cid: "qr-code",
      },
    ],
  });
}

export const isEmailStub = USE_STUB;
