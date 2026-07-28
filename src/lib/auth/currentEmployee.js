import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getEmployeeByEmail, getEmployeeRoles } from "@/lib/db/employees";

export const getAuthUser = cache(async () => {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
});

export const getCurrentEmployee = cache(async () => {
  const user = await getAuthUser();
  if (!user?.email) return { user: null, employee: null, roles: [] };

  const employee = await getEmployeeByEmail(user.email);
  if (!employee) return { user, employee: null, roles: [] };

  const roles = await getEmployeeRoles(employee.id);
  return { user, employee, roles };
});

export async function requireEmployee() {
  const ctx = await getCurrentEmployee();
  if (!ctx.user) redirect("/login");
  if (!ctx.employee) {
    redirect(`/login?error=${encodeURIComponent("No employee record for this email.")}`);
  }
  return ctx;
}
