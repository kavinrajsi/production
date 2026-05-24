import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export const getCurrentEmployee = cache(async () => {
  const user = await getAuthUser();
  if (!user?.email) return { user: null, employee: null, roles: [] };

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .ilike("work_email", user.email)
    .maybeSingle();

  if (!employee) return { user, employee: null, roles: [] };

  const { data: roleRows } = await supabase
    .from("employee_roles")
    .select("roles(name)")
    .eq("employee_id", employee.id);

  const roles = (roleRows ?? [])
    .map((r) => r.roles?.name)
    .filter(Boolean);

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
