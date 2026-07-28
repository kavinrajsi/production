import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { createEquipment } from "@/lib/db/equipment";

export async function POST(request) {
  const ctx = await requireRole("admin");
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const row = await createEquipment(body, ctx.employee.id);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Insert failed" },
      { status: 400 }
    );
  }
}
