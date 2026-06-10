import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return <AdminShell adminName={session.name}>{children}</AdminShell>;
}
