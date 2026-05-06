import { redirect } from "next/navigation";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/");

  return <AdminDashboardClient user={user} />;
}
