import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { deleteEquipment, updateEquipment } from "@/lib/db/equipment";

export async function PATCH(request, { params }) {
  await requireRole("admin");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const row = await updateEquipment(id, body);
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request, { params }) {
  await requireRole("admin");
  const { id } = await params;
  try {
    await deleteEquipment(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 400 }
    );
  }
}
