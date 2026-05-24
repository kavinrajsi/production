import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canTransition,
  getShoot,
  updateShootStatus,
} from "@/lib/db/shoots";

export async function PATCH(request, { params }) {
  const ctx = await requireEmployee();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const next = body?.status;
  if (!next) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const shoot = await getShoot(admin, id);
  if (!shoot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = ctx.roles.includes("admin");
  const isOwner = shoot.photographer_id === ctx.employee.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canTransition(shoot.status, next)) {
    return NextResponse.json(
      { error: `Cannot move from "${shoot.status}" to "${next}".` },
      { status: 400 }
    );
  }

  try {
    const updated = await updateShootStatus(admin, id, next);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 400 }
    );
  }
}
