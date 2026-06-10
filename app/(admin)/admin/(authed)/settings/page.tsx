import { prisma } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const setting = await prisma.setting.findUnique({
    where: { key: "fareKobo" },
  });
  return <SettingsClient initialFareKobo={Number(setting?.value ?? 60000)} />;
}
