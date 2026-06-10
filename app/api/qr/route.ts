import { NextResponse } from "next/server";
import { generateQrPngBuffer } from "@/lib/qr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const png = await generateQrPngBuffer(token);
  return new NextResponse(png, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
    },
  });
}
