import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth/currentEmployee";
import { availabilityFor } from "@/lib/db/shoots";

export async function GET(request) {
  await requireEmployee();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const excludeShootId = searchParams.get("excludeShootId");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end are required" },
      { status: 400 }
    );
  }
  try {
    const items = await availabilityFor({
      start,
      end,
      excludeShootId: excludeShootId ? Number(excludeShootId) : null,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Lookup failed" },
      { status: 400 }
    );
  }
}
