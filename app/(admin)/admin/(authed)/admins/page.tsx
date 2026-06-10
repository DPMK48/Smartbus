import { prisma } from "@/lib/db";
import AdminsClient from "./AdminsClient";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      createdById: true,
    },
  });
  return (
    <AdminsClient
      initial={admins.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
