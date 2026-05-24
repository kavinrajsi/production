import { redirect } from "next/navigation";
import { requireEmployee } from "./currentEmployee";

export async function requireRole(role) {
  const ctx = await requireEmployee();
  if (!ctx.roles.includes(role)) {
    redirect("/?error=forbidden");
  }
  return ctx;
}

export function hasRole(ctx, role) {
  return ctx?.roles?.includes(role) ?? false;
}
